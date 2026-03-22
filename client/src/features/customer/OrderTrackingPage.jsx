import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '../auth/authSlice';
import { CheckCircle, Circle, XCircle, MapPin, Phone, MessageSquare, AlertCircle, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetOrderByIdQuery,
  useCancelOrderMutation,
  useCreateReviewMutation,
  useFileComplaintMutation,
} from './customerApi';
import { apiSlice } from '../../app/api';
import { getSocket } from '../../socket/socketClient';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Badge from '../../components/ui/Badge';
import StarRating from '../../components/ui/StarRating';
import ImageUpload from '../../components/ui/ImageUpload';
import DeliveryTrackingMap from '../../components/map/DeliveryTrackingMap';
import ChatPanel from '../chat/ChatPanel';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

const STATUSES = [
  { key: 'placed', label: 'Order Placed', color: '#9CA3AF' },
  { key: 'accepted', label: 'Accepted', color: '#F59E0B' },
  { key: 'preparing', label: 'Preparing', color: '#FC8019' },
  { key: 'ready_for_pickup', label: 'Ready', color: '#3B82F6' },
  { key: 'picked_up', label: 'Picked Up', color: '#3B82F6' },
  { key: 'on_the_way', label: 'On the Way', color: '#3B82F6' },
  { key: 'delivered', label: 'Delivered', color: '#60B246' },
];

const STATUS_BADGE = {
  placed: 'neutral', accepted: 'info', preparing: 'warning',
  ready_for_pickup: 'info', picked_up: 'info', on_the_way: 'secondary',
  delivered: 'success', cancelled: 'danger',
};

function StatusStepper({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-[8px] p-4">
        <XCircle size={24} className="text-red-500 shrink-0" />
        <p className="font-semibold text-red-600">Order Cancelled</p>
      </div>
    );
  }

  const currentIdx = STATUSES.findIndex((s) => s.key === status);

  return (
    <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute left-4 right-4 top-4 h-0.5 bg-[#E0E0E0] z-0" />
        <div
          className="absolute left-4 top-4 h-0.5 bg-[#60B246] z-0 transition-all duration-500"
          style={{ width: currentIdx > 0 ? `${(currentIdx / (STATUSES.length - 1)) * 100}%` : '0%' }}
        />

        {STATUSES.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s.key} className="flex flex-col items-center z-10 gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  done
                    ? 'bg-[#60B246] border-[#60B246]'
                    : active
                    ? 'bg-white border-[#E23744]'
                    : 'bg-white border-[#E0E0E0]'
                }`}
                style={active ? { borderColor: s.color } : {}}
              >
                {done ? (
                  <CheckCircle size={14} className="text-white" />
                ) : (
                  <div className={`w-3 h-3 rounded-full ${active ? 'bg-[#E23744]' : 'bg-[#E0E0E0]'}`}
                    style={active ? { backgroundColor: s.color } : {}} />
                )}
              </div>
              <span className={`text-[9px] font-medium text-center hidden sm:block ${active ? 'text-[#1C1C1C]' : done ? 'text-[#60B246]' : 'text-[#9CA3AF]'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Current status label (mobile) */}
      <p className="sm:hidden text-center text-sm font-semibold mt-3 text-[#1C1C1C]">
        {STATUSES[currentIdx]?.label || status}
      </p>
    </div>
  );
}

function ReviewForm({ orderId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [createReview, { isLoading }] = useCreateReviewMutation();

  const handleSubmit = async () => {
    if (!rating || !comment.trim()) { toast.error('Please add a rating and comment'); return; }
    const fd = new FormData();
    fd.append('rating', rating);
    fd.append('comment', comment);
    images.forEach((img) => fd.append('images', img));
    try {
      await createReview({ orderId, formData: fd }).unwrap();
      toast.success('Review submitted!');
      onSubmitted?.();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to submit review');
    }
  };

  return (
    <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4">
      <h3 className="text-sm font-semibold text-[#1C1C1C] mb-3">Rate Your Experience</h3>
      <div className="flex justify-center mb-4">
        <StarRating rating={rating} interactive onChange={setRating} size={28} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us about your experience…"
        rows={3}
        minLength={10}
        maxLength={1000}
        className="w-full border border-[#E0E0E0] rounded-[6px] p-3 text-sm resize-none focus:outline-none focus:border-[#E23744] mb-3"
      />
      <ImageUpload files={images} onChange={setImages} maxFiles={3} label="Add Photos (optional)" />
      <Button fullWidth loading={isLoading} onClick={handleSubmit} className="mt-3" disabled={!rating}>
        Submit Review
      </Button>
    </div>
  );
}

function ComplaintModal({ isOpen, onClose, orderId }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [fileComplaint, { isLoading }] = useFileComplaintMutation();

  const handleSubmit = async () => {
    try {
      await fileComplaint({ orderId, subject, description }).unwrap();
      toast.success('Complaint filed');
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to file complaint');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report an Issue"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button loading={isLoading} disabled={!subject || description.length < 20} onClick={handleSubmit}>
          Submit
        </Button>
      </>}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-[#1C1C1C] block mb-1">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={100}
            placeholder="Brief description of the issue"
            className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:border-[#E23744]"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#1C1C1C] block mb-1">Details</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minLength={20}
            maxLength={1000}
            rows={4}
            placeholder="Describe the issue in detail (min 20 characters)"
            className="w-full border border-[#E0E0E0] rounded-[6px] p-3 text-sm resize-none focus:outline-none focus:border-[#E23744]"
          />
          <p className="text-xs text-[#7E808C] text-right">{description.length}/1000</p>
        </div>
      </div>
    </Modal>
  );
}

export default function OrderTrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [riderLocation, setRiderLocation] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showComplaint, setShowComplaint] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const currentUser = useSelector(selectCurrentUser);
  const showChatRef = useRef(showChat);
  showChatRef.current = showChat;

  const { data, isLoading, refetch } = useGetOrderByIdQuery(id);
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();

  const order = data?.order;

  // Socket: join order room + listen for updates + messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;

    socket.emit('join_order', { orderId: id });

    const onStatusUpdate = (data) => {
      if (data.orderId === id) {
        dispatch(apiSlice.util.invalidateTags([{ type: 'Order', id }]));
      }
    };

    const onLocationUpdate = (data) => {
      if (data.orderId === id) {
        setRiderLocation({ latitude: data.latitude, longitude: data.longitude });
      }
    };

    const onNewMessage = (msg) => {
      if (msg.orderId === id || msg.orderId?._id === id) {
        const senderId = msg.senderId?._id || msg.senderId;
        if (senderId !== currentUser?._id && !showChatRef.current) {
          setUnreadMessages((prev) => prev + 1);
        }
      }
    };

    socket.on('order_status_update', onStatusUpdate);
    socket.on('rider_location_update', onLocationUpdate);
    socket.on('new_message', onNewMessage);

    return () => {
      socket.emit('leave_order', { orderId: id });
      socket.off('order_status_update', onStatusUpdate);
      socket.off('rider_location_update', onLocationUpdate);
      socket.off('new_message', onNewMessage);
    };
  }, [id, dispatch, currentUser?._id]);

  const handleCancel = async () => {
    if (cancelReason.trim().length < 10) {
      toast.error('Please provide a reason (at least 10 characters)');
      return;
    }
    try {
      await cancelOrder({ id, reason: cancelReason.trim() }).unwrap();
      setShowCancelConfirm(false);
      setCancelReason('');
      toast.success('Order cancelled');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Cannot cancel this order');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!order) {
    return <div className="text-center py-20 text-[#7E808C]">Order not found</div>;
  }

  const isInDelivery = ['picked_up', 'on_the_way'].includes(order.status);
  const isDelivered = order.status === 'delivered';
  const canCancel = order.status === 'placed';
  const hasRider = !!order.riderId;
  const showMap = isInDelivery && hasRider;

  // Extract coordinates for map
  const customerLoc = order.deliveryAddress?.coordinates
    ? { longitude: order.deliveryAddress.coordinates[0], latitude: order.deliveryAddress.coordinates[1] }
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-16 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#1C1C1C]">Order #{order.orderNumber}</h1>
          <p className="text-xs text-[#7E808C]">{formatDateTime(order.createdAt)}</p>
        </div>
        <Badge variant={STATUS_BADGE[order.status] || 'neutral'}>
          {order.status?.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Status stepper */}
      <StatusStepper status={order.status} />

      {/* Live map */}
      {showMap && (
        <div>
          <p className="text-xs text-[#7E808C] mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> Live tracking
          </p>
          <DeliveryTrackingMap
            riderLocation={riderLocation}
            customerLocation={customerLoc ? { latitude: customerLoc.latitude, longitude: customerLoc.longitude } : null}
            restaurantLocation={
              order.restaurantId?.address?.coordinates
                ? { longitude: order.restaurantId.address.coordinates[0], latitude: order.restaurantId.address.coordinates[1] }
                : null
            }
          />
        </div>
      )}

      {/* Rider info */}
      {hasRider && (order.riderId?.name) && (
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm overflow-hidden">
              {order.riderId?.profilePhoto?.url
                ? <img src={order.riderId.profilePhoto.url} alt="" className="w-full h-full object-cover" />
                : order.riderId?.name?.[0]?.toUpperCase()
              }
            </div>
            <div>
              <p className="text-sm font-medium text-[#1C1C1C]">{order.riderId?.name}</p>
              <p className="text-xs text-[#7E808C]">Your delivery rider</p>
            </div>
          </div>
          <div className="flex gap-2">
            {order.riderId?.phone && (
              <a href={`tel:${order.riderId.phone}`}
                className="w-9 h-9 border border-[#E0E0E0] rounded-full flex items-center justify-center text-[#7E808C] hover:text-[#1C1C1C]">
                <Phone size={16} />
              </a>
            )}
            <button
              onClick={() => { setShowChat(true); setUnreadMessages(0); }}
              className="relative w-9 h-9 border border-[#E23744] rounded-full flex items-center justify-center text-[#E23744] hover:bg-[#fff0f1]"
            >
              <MessageSquare size={16} />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E23744] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4">
        <h3 className="text-sm font-semibold text-[#1C1C1C] mb-3">
          {order.restaurantId?.name || 'Order'} · {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
        </h3>
        <div className="space-y-2">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-[#1C1C1C]">{item.name} × {item.quantity}</span>
              <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#E0E0E0] mt-3 pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-[#7E808C]">
            <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[#7E808C]">
            <span>Delivery Fee</span><span>{formatCurrency(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-[#7E808C]">
            <span>Platform Fee</span><span>{formatCurrency(10)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span><span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t border-[#E0E0E0]">
            <span>Total</span>
            <span className="text-[#E23744]">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Delivery address */}
        <div className="mt-3 pt-3 border-t border-[#E0E0E0]">
          <p className="text-xs text-[#7E808C] flex items-start gap-1.5">
            <MapPin size={12} className="text-[#E23744] mt-0.5 shrink-0" />
            {order.deliveryAddress?.address}
          </p>
        </div>
      </div>

      {/* Review form (delivered, not yet reviewed) */}
      {isDelivered && !order.isReviewed && !reviewSubmitted && (
        <ReviewForm orderId={id} onSubmitted={() => setReviewSubmitted(true)} />
      )}

      {/* Review shown */}
      {isDelivered && order.isReviewed && (
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4">
          <h3 className="text-sm font-semibold text-[#1C1C1C] mb-2 flex items-center gap-2">
            <Star size={14} className="text-yellow-400" /> Your Review
          </h3>
          <p className="text-sm text-[#7E808C]">You already reviewed this order. Thank you!</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {isDelivered && (
          <Button
            variant="outline"
            onClick={() => setShowComplaint(true)}
            className="flex items-center gap-2"
          >
            <AlertCircle size={16} /> Report an Issue
          </Button>
        )}
        {canCancel && (
          <Button variant="danger" onClick={() => setShowCancelConfirm(true)}>
            Cancel Order
          </Button>
        )}
      </div>

      {/* Chat panel */}
      {showChat && (
        <ChatPanel
          orderId={id}
          riderName={order.riderId?.name}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Cancel confirm modal */}
      <Modal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Cancel Order"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCancelConfirm(false)}>Keep Order</Button>
            <Button variant="danger" loading={isCancelling} onClick={handleCancel}>Cancel Order</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#7E808C]">Are you sure you want to cancel this order?</p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Please provide a reason for cancellation (min 10 characters)"
            rows={3}
            className="w-full border border-[#E0E0E0] rounded-[6px] p-3 text-sm resize-none focus:outline-none focus:border-[#E23744]"
          />
        </div>
      </Modal>

      {/* Complaint modal */}
      <ComplaintModal isOpen={showComplaint} onClose={() => setShowComplaint(false)} orderId={id} />
    </div>
  );
}
