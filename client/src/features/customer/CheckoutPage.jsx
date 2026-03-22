import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MapPin, Tag, CreditCard, Banknote, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetCartQuery, useApplyCouponMutation, usePlaceOrderMutation } from './customerApi';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import LocationPicker from '../../components/map/LocationPicker';
import { formatCurrency } from '../../utils/formatCurrency';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

  const { data } = useGetCartQuery();
  const [applyCoupon, { isLoading: isApplying }] = useApplyCouponMutation();
  const [placeOrder] = usePlaceOrderMutation();

  const cart = data?.cart;
  const items = cart?.items || [];

  if (!cart || items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-[#7E808C]">Your cart is empty.</p>
        <button onClick={() => navigate('/restaurants')} className="text-[#E23744] hover:underline text-sm mt-2">Browse Restaurants</button>
      </div>
    );
  }

  const subtotal = cart.subtotal || 0;
  const deliveryFee = cart.deliveryFee || 0;
  const platformFee = 10;
  const discount = appliedCoupon?.discount || 0;
  const total = subtotal + deliveryFee + platformFee - discount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await applyCoupon({
        code: couponCode,
        restaurantId: cart.restaurantId?._id || cart.restaurantId,
        subtotal,
      }).unwrap();
      setAppliedCoupon(res);
      toast.success(`Coupon applied! You save ${formatCurrency(res.discount)}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid coupon');
    }
  };

  const handlePlaceOrder = async () => {
    if (!address || !coords) {
      toast.error('Please select a delivery address');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setIsPlacing(true);
    try {
      const orderData = {
        deliveryAddress: {
          address,
          latitude: coords.lat,
          longitude: coords.lng,
        },
        paymentMethod,
        orderInstructions: instructions || undefined,
        couponCode: appliedCoupon ? couponCode : undefined,
      };

      const res = await placeOrder(orderData).unwrap();

      if (paymentMethod === 'stripe' && res.stripeUrl) {
        window.location.href = res.stripeUrl;
      } else {
        const orderId = res.data?._id || res.orderId;
        navigate(`/order-success?orderId=${orderId}`);
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to place order');
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-[#1C1C1C] mb-6">Checkout</h1>

      {/* Delivery address */}
      <section className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1C1C1C] flex items-center gap-2">
            <MapPin size={16} className="text-[#E23744]" /> Delivery Address
          </h2>
          <button onClick={() => setShowMapModal(true)} className="text-xs text-[#E23744] hover:underline">
            {address ? 'Change' : 'Select'}
          </button>
        </div>
        {address ? (
          <p className="text-sm text-[#7E808C]">{address}</p>
        ) : (
          <button
            onClick={() => setShowMapModal(true)}
            className="w-full border-2 border-dashed border-[#E0E0E0] rounded-[8px] py-6 text-sm text-[#7E808C] hover:border-[#E23744] transition-colors"
          >
            + Select delivery address
          </button>
        )}
      </section>

      {/* Order items */}
      <section className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 mb-4">
        <h2 className="text-sm font-semibold text-[#1C1C1C] mb-3">
          {cart.restaurantId?.name || 'Order'} · {items.length} item{items.length !== 1 ? 's' : ''}
        </h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.menuItemId?._id || item.menuItemId} className="flex justify-between text-sm">
              <span className="text-[#1C1C1C]">
                {item.menuItemId?.name || 'Item'} × {item.quantity}
              </span>
              <span className="font-medium">{formatCurrency((item.menuItemId?.price || item.price || 0) * item.quantity)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Instructions */}
      <section className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 mb-4">
        <label className="text-sm font-semibold text-[#1C1C1C] block mb-2">Order Instructions (optional)</label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Any delivery or order notes?"
          className="w-full border border-[#E0E0E0] rounded-[6px] p-3 text-sm resize-none focus:outline-none focus:border-[#E23744]"
        />
        <p className="text-xs text-[#7E808C] text-right mt-1">{instructions.length}/1000</p>
      </section>

      {/* Coupon */}
      <section className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 mb-4">
        <h2 className="text-sm font-semibold text-[#1C1C1C] flex items-center gap-2 mb-3">
          <Tag size={16} className="text-[#FC8019]" /> Coupon Code
        </h2>
        {appliedCoupon ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-[6px] px-3 py-2">
            <div>
              <p className="text-sm font-medium text-green-700">{couponCode} applied</p>
              <p className="text-xs text-green-600">You save {formatCurrency(discount)}</p>
            </div>
            <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}>
              <X size={16} className="text-green-600" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="flex-1 border border-[#E0E0E0] rounded-[6px] px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:border-[#E23744]"
            />
            <Button variant="outline" size="sm" loading={isApplying} onClick={handleApplyCoupon}>
              Apply
            </Button>
          </div>
        )}
      </section>

      {/* Payment method */}
      <section className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 mb-4">
        <h2 className="text-sm font-semibold text-[#1C1C1C] mb-3">Payment Method</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'stripe', label: 'Pay with Card', icon: CreditCard, sublabel: 'Stripe secure payment' },
            { value: 'cod', label: 'Cash on Delivery', icon: Banknote, sublabel: 'Pay when delivered' },
          ].map(({ value, label, icon: Icon, sublabel }) => (
            <button
              key={value}
              onClick={() => setPaymentMethod(value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-[8px] border-2 transition-colors ${
                paymentMethod === value
                  ? 'border-[#E23744] bg-[#fff0f1]'
                  : 'border-[#E0E0E0] hover:border-[#E23744]/40'
              }`}
            >
              <Icon size={24} className={paymentMethod === value ? 'text-[#E23744]' : 'text-[#7E808C]'} />
              <span className={`text-sm font-medium ${paymentMethod === value ? 'text-[#E23744]' : 'text-[#1C1C1C]'}`}>
                {label}
              </span>
              <span className="text-xs text-[#7E808C] text-center">{sublabel}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Price breakdown */}
      <section className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 mb-6">
        <h2 className="text-sm font-semibold text-[#1C1C1C] mb-3">Price Breakdown</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-[#7E808C]">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-[#7E808C]">Delivery Fee</span><span>{formatCurrency(deliveryFee)}</span></div>
          <div className="flex justify-between"><span className="text-[#7E808C]">Platform Fee</span><span>{formatCurrency(platformFee)}</span></div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Coupon Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-[#E0E0E0]">
            <span>Total</span>
            <span className="text-[#E23744]">{formatCurrency(total)}</span>
          </div>
        </div>
      </section>

      <Button
        fullWidth
        size="lg"
        loading={isPlacing}
        disabled={!paymentMethod}
        onClick={handlePlaceOrder}
        className="flex items-center justify-center gap-2"
      >
        Place Order · {formatCurrency(total)} <ChevronRight size={18} />
      </Button>

      {/* Location picker modal */}
      <Modal isOpen={showMapModal} onClose={() => setShowMapModal(false)} title="Select Delivery Address">
        <LocationPicker
          initialLocation={coords ? { latitude: coords.lat, longitude: coords.lng, address } : null}
          onLocationSelect={(loc) => {
            setAddress(loc.address);
            setCoords({ lat: loc.latitude, lng: loc.longitude });
          }}
        />
        <div className="mt-4">
          <Button fullWidth onClick={() => setShowMapModal(false)} disabled={!coords}>
            Confirm Address
          </Button>
        </div>
      </Modal>
    </div>
  );
}
