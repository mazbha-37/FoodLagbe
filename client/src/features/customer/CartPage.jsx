import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetCartQuery, useUpdateCartItemMutation, useRemoveCartItemMutation, useClearCartMutation } from './customerApi';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';

function CartItem({ item, onUpdate, onRemove }) {
  const [showInstructions, setShowInstructions] = useState(!!item.specialInstructions);
  const [instructions, setInstructions] = useState(item.specialInstructions || '');

  const handleInstructionsBlur = () => {
    if (instructions !== item.specialInstructions) {
      onUpdate(item.menuItemId?._id || item.menuItemId, item.quantity, instructions);
    }
  };

  const name = item.menuItemId?.name || 'Item';
  const price = item.menuItemId?.price || item.price || 0;
  const image = item.menuItemId?.photo?.url;
  const menuItemId = item.menuItemId?._id || item.menuItemId;

  return (
    <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4">
      <div className="flex gap-3">
        {image && (
          <img src={image} alt={name} className="w-16 h-16 rounded object-cover shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-medium text-[#1C1C1C]">{name}</h4>
            <button onClick={() => onRemove(menuItemId)} className="text-[#7E808C] hover:text-red-500 ml-2">
              <Trash2 size={16} />
            </button>
          </div>
          <p className="text-sm font-semibold text-[#1C1C1C] mt-0.5">{formatCurrency(price)}</p>

          {/* Qty controls */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center border border-[#E23744] rounded-[6px] overflow-hidden">
              <button
                onClick={() => item.quantity > 1 ? onUpdate(menuItemId, item.quantity - 1, instructions) : onRemove(menuItemId)}
                className="px-2.5 py-1 text-[#E23744] hover:bg-[#fff0f1]"
              >
                <Minus size={14} />
              </button>
              <span className="px-3 py-1 text-sm font-medium text-[#1C1C1C]">{item.quantity}</span>
              <button onClick={() => onUpdate(menuItemId, item.quantity + 1, instructions)}
                className="px-2.5 py-1 text-[#E23744] hover:bg-[#fff0f1]">
                <Plus size={14} />
              </button>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(price * item.quantity)}</p>
          </div>

          {/* Special instructions */}
          <button
            onClick={() => setShowInstructions((v) => !v)}
            className="text-xs text-[#7E808C] hover:text-[#1C1C1C] mt-2"
          >
            {showInstructions ? '− Hide' : '+ Add'} special instructions
          </button>
          {showInstructions && (
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onBlur={handleInstructionsBlur}
              placeholder="Any special requests? (e.g. no spice, extra sauce)"
              rows={2}
              className="mt-2 w-full text-xs border border-[#E0E0E0] rounded-[6px] p-2 resize-none focus:outline-none focus:border-[#E23744]"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const [showClearModal, setShowClearModal] = useState(false);
  const { data, isLoading } = useGetCartQuery();
  const [updateCartItem, { isLoading: isUpdating }] = useUpdateCartItemMutation();
  const [removeCartItem] = useRemoveCartItemMutation();
  const [clearCart, { isLoading: isClearing }] = useClearCartMutation();

  const cart = data?.cart;
  const items = cart?.items || [];

  const handleUpdate = async (menuItemId, quantity, specialInstructions) => {
    try {
      if (quantity === 0) {
        await removeCartItem(menuItemId).unwrap();
      } else {
        await updateCartItem({ menuItemId, quantity, specialInstructions }).unwrap();
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update cart');
    }
  };

  const handleRemove = async (menuItemId) => {
    try {
      await removeCartItem(menuItemId).unwrap();
    } catch (err) {
      toast.error('Failed to remove item');
    }
  };

  const handleClear = async () => {
    try {
      await clearCart().unwrap();
      setShowClearModal(false);
      toast.success('Cart cleared');
    } catch (err) {
      toast.error('Failed to clear cart');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <ShoppingCart size={64} className="text-[#E0E0E0] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#1C1C1C] mb-2">Your cart is empty</h2>
        <p className="text-sm text-[#7E808C] mb-6">Add items from a restaurant to get started</p>
        <Link to="/restaurants">
          <Button>Browse Restaurants</Button>
        </Link>
      </div>
    );
  }

  const subtotal = cart?.subtotal || items.reduce((s, i) => s + (i.menuItemId?.price || i.price || 0) * i.quantity, 0);
  const deliveryFee = cart?.deliveryFee || 0;
  const platformFee = 10;
  const total = subtotal + deliveryFee + platformFee;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#1C1C1C]">
          {cart?.restaurantId?.name || 'Your Cart'}
        </h1>
        <button
          onClick={() => setShowClearModal(true)}
          className="text-sm text-red-500 hover:underline"
        >
          Clear Cart
        </button>
      </div>

      {/* Items */}
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <CartItem
            key={item.menuItemId?._id || item.menuItemId}
            item={item}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {/* Price summary */}
      <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 mb-6">
        <h3 className="text-sm font-semibold text-[#1C1C1C] mb-3">Price Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#7E808C]">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7E808C]">Delivery Fee</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7E808C]">Platform Fee</span>
            <span>{formatCurrency(platformFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-[#E0E0E0]">
            <span>Total</span>
            <span className="text-[#E23744]">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <Button
        fullWidth
        size="lg"
        onClick={() => navigate('/checkout')}
        className="flex items-center justify-center gap-2"
      >
        Proceed to Checkout <ChevronRight size={18} />
      </Button>

      {/* Clear cart confirm */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear Cart"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowClearModal(false)}>Cancel</Button>
            <Button variant="danger" loading={isClearing} onClick={handleClear}>Clear Cart</Button>
          </>
        }
      >
        <p className="text-sm text-[#7E808C]">
          Are you sure you want to remove all items from your cart?
        </p>
      </Modal>
    </div>
  );
}
