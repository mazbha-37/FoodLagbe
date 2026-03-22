import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Star, Clock, MapPin, ChevronRight, Plus, Minus, MessageSquare, ShoppingCart } from 'lucide-react';
import { useGetRestaurantByIdQuery, useGetRestaurantReviewsQuery, useGetCartQuery, useAddToCartMutation, useUpdateCartItemMutation, useClearCartMutation } from './customerApi';
import { selectIsAuthenticated } from '../auth/authSlice';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StarRating from '../../components/ui/StarRating';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatRelativeDate } from '../../utils/formatDate';

function ReviewCard({ review }) {
  return (
    <div className="py-4 border-b border-[#E0E0E0] last:border-0">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-[#E23744] text-white flex items-center justify-center text-sm font-semibold">
          {review.customerId?.name?.[0] || 'U'}
        </div>
        <div>
          <p className="text-sm font-medium text-[#1C1C1C]">{review.customerId?.name || 'Customer'}</p>
          <p className="text-xs text-[#7E808C]">{formatRelativeDate(review.createdAt)}</p>
        </div>
        <StarRating rating={review.rating} size={14} className="ml-auto" />
      </div>
      <p className="text-sm text-[#1C1C1C]">{review.comment}</p>
      {review.images?.length > 0 && (
        <div className="flex gap-2 mt-2">
          {review.images.map((img, i) => (
            <img key={i} src={img.url} alt="" className="w-16 h-16 rounded object-cover border border-[#E0E0E0]" />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  const { data: restData, isLoading } = useGetRestaurantByIdQuery({ id, lat, lng });
  const { data: cartData } = useGetCartQuery(undefined, { skip: !isAuthenticated });
  const [addToCart] = useAddToCartMutation();
  const [updateCartItem] = useUpdateCartItemMutation();

  const [activeCategory, setActiveCategory] = useState(null);
  const [reviewSort, setReviewSort] = useState('recent');
  const [reviewPage, setReviewPage] = useState(1);
  const [confirmSwitch, setConfirmSwitch] = useState(null);
  const categoryRefs = useRef({});
  const [clearCart, { isLoading: isClearing }] = useClearCartMutation();

  const { data: reviewData } = useGetRestaurantReviewsQuery(
    { id, page: reviewPage, limit: 5, sort: reviewSort },
    { skip: !restData }
  );

  const restaurant = restData?.restaurant;
  const cart = cartData?.cart;
  const categories = restaurant?.menu || [];

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]._id);
    }
  }, [categories]);

  const getCartQty = (menuItemId) => {
    if (!cart) return 0;
    const item = cart.items?.find((i) => i.menuItemId?._id === menuItemId || i.menuItemId === menuItemId);
    return item?.quantity || 0;
  };

  const handleAdd = async (item) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      await addToCart({ menuItemId: item._id, quantity: 1 }).unwrap();
    } catch (err) {
      if (err?.status === 409) {
        setConfirmSwitch(item);
      } else {
        toast.error(err?.data?.message || 'Failed to add to cart');
      }
    }
  };

  const handleQty = async (menuItemId, newQty) => {
    try {
      await updateCartItem({ menuItemId, quantity: newQty }).unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update cart');
    }
  };

  const scrollToCategory = (catId) => {
    setActiveCategory(catId);
    categoryRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cartCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) || 0;
  const cartTotal = cart?.subtotal || cart?.items?.reduce((s, i) => s + i.itemPrice * i.quantity, 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-20">
        <p className="text-[#7E808C]">Restaurant not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Hero */}
      <div className="relative h-48 md:h-64 bg-gray-200">
        {restaurant.coverPhoto?.url ? (
          <img src={restaurant.coverPhoto.url} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#E23744]/30 to-[#FC8019]/30 flex items-center justify-center text-6xl">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white">{restaurant.name}</h1>
          <p className="text-sm text-white/80">{restaurant.cuisineTypes?.join(' · ')}</p>
        </div>
        {!restaurant.isOpen && (
          <div className="absolute top-4 right-4 bg-red-600 text-white text-sm font-semibold px-3 py-1 rounded-full">
            Closed
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="bg-white px-4 py-3 border-b border-[#E0E0E0] flex flex-wrap gap-4 text-sm text-[#7E808C]">
        <span className="flex items-center gap-1.5">
          <Star size={14} className="fill-yellow-400 text-yellow-400" />
          <span className="font-medium text-[#1C1C1C]">{restaurant.rating?.toFixed(1) || 'New'}</span>
          ({restaurant.reviewCount || 0} reviews)
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={14} /> {restaurant.deliveryTime || 30}–{(restaurant.deliveryTime || 30) + 10} min
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin size={14} /> {formatCurrency(restaurant.deliveryFee || 0)} delivery
        </span>
        {restaurant.minimumOrderAmount > 0 && (
          <span>Min. order {formatCurrency(restaurant.minimumOrderAmount)}</span>
        )}
        {!restaurant.isOpen && (
          <Badge variant="danger">Currently Closed</Badge>
        )}
      </div>

      {/* Closed banner */}
      {!restaurant.isOpen && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span className="font-medium">This restaurant is currently closed.</span> You can still browse the menu.
        </div>
      )}

      <div className="flex gap-0">
        {/* Category sidebar */}
        <aside className="hidden md:block w-48 shrink-0 bg-white border-r border-[#E0E0E0] sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => scrollToCategory(cat._id)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-[#E0E0E0] transition-colors ${
                activeCategory === cat._id
                  ? 'bg-[#fff0f1] text-[#E23744] font-medium border-r-2 border-r-[#E23744]'
                  : 'text-[#1C1C1C] hover:bg-[#F1F1F6]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </aside>

        {/* Main menu */}
        <div className="flex-1 min-w-0">
          {/* Mobile category tabs */}
          <div className="md:hidden bg-white border-b border-[#E0E0E0] overflow-x-auto flex gap-0 sticky top-14 z-10">
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => scrollToCategory(cat._id)}
                className={`shrink-0 px-4 py-3 text-sm border-b-2 transition-colors ${
                  activeCategory === cat._id ? 'border-[#E23744] text-[#E23744] font-medium' : 'border-transparent text-[#7E808C]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu categories */}
          <div className="px-4 py-4 space-y-8">
            {categories.map((cat) => (
              <div key={cat._id} ref={(el) => (categoryRefs.current[cat._id] = el)}>
                <h2 className="text-base font-bold text-[#1C1C1C] mb-3 pb-2 border-b border-[#E0E0E0]">{cat.name}</h2>
                <div className="space-y-3">
                  {cat.items?.map((item) => {
                    const qty = getCartQty(item._id);
                    const unavailable = !item.isAvailable;
                    return (
                      <div
                        key={item._id}
                        className={`flex gap-3 p-3 rounded-[8px] border border-[#E0E0E0] bg-white ${unavailable ? 'opacity-50' : ''}`}
                      >
                        {item.photo?.url && (
                          <img src={item.photo.url} alt={item.name} className="w-20 h-20 rounded object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[#1C1C1C] text-sm">{item.name}</h4>
                          {item.description && (
                            <p className="text-xs text-[#7E808C] mt-0.5 line-clamp-2">{item.description}</p>
                          )}
                          <p className="font-semibold text-[#1C1C1C] mt-1 text-sm">{formatCurrency(item.price)}</p>
                          {unavailable && <p className="text-xs text-red-500 mt-1">Unavailable</p>}
                        </div>
                        {!unavailable && restaurant.isOpen && (
                          <div className="shrink-0 flex items-end">
                            {qty === 0 ? (
                              <button
                                onClick={() => handleAdd(item)}
                                className="flex items-center gap-1 bg-[#E23744] hover:bg-[#c42f3a] text-white px-3 py-1.5 rounded-[6px] text-sm font-medium transition-colors"
                              >
                                <Plus size={14} /> Add
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 border border-[#E23744] rounded-[6px] overflow-hidden">
                                <button
                                  onClick={() => handleQty(item._id, qty - 1)}
                                  className="px-2 py-1.5 text-[#E23744] hover:bg-[#fff0f1]"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="px-1 text-sm font-medium text-[#1C1C1C] min-w-[20px] text-center">{qty}</span>
                                <button
                                  onClick={() => handleQty(item._id, qty + 1)}
                                  className="px-2 py-1.5 text-[#E23744] hover:bg-[#fff0f1]"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Reviews */}
            <div>
              <h2 className="text-base font-bold text-[#1C1C1C] mb-3 pb-2 border-b border-[#E0E0E0] flex items-center gap-2">
                <MessageSquare size={16} /> Reviews
              </h2>
              {/* Sort tabs */}
              <div className="flex gap-2 mb-4">
                {[['recent', 'Recent'], ['highest', 'Highest'], ['lowest', 'Lowest']].map(([v, l]) => (
                  <button key={v} onClick={() => { setReviewSort(v); setReviewPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      reviewSort === v ? 'bg-[#E23744] text-white border-[#E23744]' : 'border-[#E0E0E0] text-[#7E808C] hover:border-[#E23744]'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
              <div>
                {reviewData?.reviews?.map((r) => <ReviewCard key={r._id} review={r} />)}
                {(!reviewData?.reviews || reviewData.reviews.length === 0) && (
                  <p className="text-sm text-[#7E808C] py-4">No reviews yet.</p>
                )}
              </div>
              {reviewPage < (reviewData?.pages || 1) && (
                <button onClick={() => setReviewPage((p) => p + 1)}
                  className="mt-4 text-sm text-[#E23744] hover:underline">
                  Load more reviews
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div
          onClick={() => navigate('/cart')}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-80 bg-[#E23744] text-white rounded-[12px] px-4 py-3.5 flex items-center justify-between cursor-pointer shadow-lg hover:bg-[#c42f3a] transition-colors z-40"
        >
          <div className="flex items-center gap-3">
            <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">{cartCount}</span>
            <span className="text-sm font-medium">View Cart</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{formatCurrency(cartTotal)}</span>
            <ChevronRight size={16} />
          </div>
        </div>
      )}

      {/* Confirm restaurant switch modal */}
      <Modal
        isOpen={!!confirmSwitch}
        onClose={() => setConfirmSwitch(null)}
        title="Start a new cart?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmSwitch(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={isClearing}
              onClick={async () => {
                try {
                  await clearCart().unwrap();
                  await handleAdd(confirmSwitch);
                } catch {}
                setConfirmSwitch(null);
              }}
            >
              Start New Cart
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#7E808C]">
          Your cart has items from another restaurant. Starting a new cart will remove your current items.
        </p>
      </Modal>
    </div>
  );
}
