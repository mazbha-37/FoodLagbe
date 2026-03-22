import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Phone, MessageCircle, Package, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../auth/authSlice';
import { useGetActiveDeliveryQuery, useUpdateDeliveryStatusMutation } from './riderApi';
import { getSocket } from '../../socket/socketClient';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import RiderRouteMap from '../../components/map/RiderRouteMap';
import ChatPanel from '../chat/ChatPanel';
import { formatCurrency } from '../../utils/formatCurrency';

// Status flow: picked_up → on_the_way → delivered
const DELIVERY_STEPS = [
  { status: 'picked_up', label: 'Picked Up', phase: 'pickup' },
  { status: 'on_the_way', label: 'On the Way', phase: 'delivery' },
  { status: 'delivered', label: 'Delivered', phase: 'delivery' },
];

const STEP_ORDER = DELIVERY_STEPS.map((s) => s.status);

function currentPhase(status) {
  const deliveryPhaseStatuses = ['on_the_way', 'delivered'];
  return deliveryPhaseStatuses.includes(status) ? 'delivery' : 'pickup';
}

function nextStep(status) {
  const idx = STEP_ORDER.indexOf(status);
  // If current status is before our steps (e.g. ready_for_pickup), show the first step
  if (idx === -1) return DELIVERY_STEPS[0] || null;
  if (idx >= STEP_ORDER.length - 1) return null;
  return DELIVERY_STEPS[idx + 1];
}

export default function ActiveDelivery() {
  const { data, isLoading, refetch } = useGetActiveDeliveryQuery(undefined, { pollingInterval: 15000 });
  const [updateDeliveryStatus, { isLoading: isUpdating }] = useUpdateDeliveryStatusMutation();

  const currentUser = useSelector(selectCurrentUser);
  const [riderPosition, setRiderPosition] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const showChatRef = useRef(showChat);
  showChatRef.current = showChat;
  const watchIdRef = useRef(null);
  const socketEmitRef = useRef(null);

  const order = data?.order;

  // GPS broadcast
  useEffect(() => {
    if (!order || !navigator.geolocation) return;
    const socket = getSocket();

    const emitPosition = (latitude, longitude) => {
      if (socket?.connected) {
        socket.emit('rider_location_update', {
          orderId: order._id,
          latitude,
          longitude,
        });
      }
    };

    let lastEmit = 0;
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        setRiderPosition([latitude, longitude]);
        const now = Date.now();
        if (now - lastEmit >= 5000) {
          lastEmit = now;
          emitPosition(latitude, longitude);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [order?._id]);

  // Listen for new messages even when chat panel is closed
  useEffect(() => {
    if (!order?._id) return;
    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = (msg) => {
      const msgOrderId = msg.orderId?._id || msg.orderId;
      if (msgOrderId === order._id) {
        const senderId = msg.senderId?._id || msg.senderId;
        if (senderId !== currentUser?._id && !showChatRef.current) {
          setUnreadMessages((prev) => prev + 1);
        }
      }
    };

    socket.on('new_message', onNewMessage);
    return () => socket.off('new_message', onNewMessage);
  }, [order?._id, currentUser?._id]);

  const handleUpdateStatus = async (status) => {
    try {
      await updateDeliveryStatus({ orderId: order._id, status }).unwrap();
      toast.success('Status updated');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Active Delivery">
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Active Delivery">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F1F1F6] flex items-center justify-center mb-4">
            <Package size={28} className="text-[#7E808C]" />
          </div>
          <h2 className="text-lg font-semibold text-[#1C1C1C] mb-2">No Active Delivery</h2>
          <p className="text-sm text-[#7E808C] max-w-xs">
            Toggle your availability on the dashboard to start receiving delivery requests.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const phase = currentPhase(order.status);
  const next = nextStep(order.status);

  const restaurantCoords = order.restaurantId?.location?.coordinates
    ? [order.restaurantId.location.coordinates[1], order.restaurantId.location.coordinates[0]]
    : null;

  const customerCoords = order.deliveryAddress?.location?.coordinates
    ? [order.deliveryAddress.location.coordinates[1], order.deliveryAddress.location.coordinates[0]]
    : null;

  return (
    <DashboardLayout title="Active Delivery">
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-130px)] min-h-[500px]">
        {/* Map */}
        <div className="flex-1 rounded-[8px] overflow-hidden border border-[#E0E0E0] min-h-[300px]">
          <RiderRouteMap
            riderPosition={riderPosition}
            restaurantPosition={restaurantCoords}
            customerPosition={customerCoords}
            phase={phase}
            restaurantName={order.restaurantId?.name}
            customerName={order.customerId?.name}
          />
        </div>

        {/* Info panel */}
        <div className="lg:w-80 flex flex-col gap-3">
          {/* Order header */}
          <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-[#1C1C1C]">
                Order #{order._id?.slice(-6).toUpperCase()}
              </p>
              <Badge variant="info">{order.status?.replace(/_/g, ' ')}</Badge>
            </div>
            <p className="text-sm font-bold text-[#1C1C1C]">{formatCurrency(order.total || 0)}</p>
          </div>

          {/* Phase card */}
          {phase === 'pickup' ? (
            <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#E23744]" />
                <p className="text-xs font-semibold text-[#7E808C] uppercase tracking-wide">Pickup</p>
              </div>
              <p className="font-medium text-[#1C1C1C]">{order.restaurantId?.name}</p>
              <div className="flex items-start gap-1.5 text-xs text-[#7E808C]">
                <MapPin size={12} className="shrink-0 mt-0.5 text-[#E23744]" />
                <span>{order.restaurantId?.address}</span>
              </div>
              <div className="pt-2 space-y-1">
                {order.items?.map((item, i) => (
                  <p key={i} className="text-sm text-[#1C1C1C]">
                    {item.quantity}× {item.menuItemId?.name || 'Item'}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#60B246]" />
                <p className="text-xs font-semibold text-[#7E808C] uppercase tracking-wide">Delivery</p>
              </div>
              <p className="font-medium text-[#1C1C1C]">{order.customerId?.name}</p>
              <div className="flex items-start gap-1.5 text-xs text-[#7E808C]">
                <MapPin size={12} className="shrink-0 mt-0.5 text-[#60B246]" />
                <span>{order.deliveryAddress?.address || order.deliveryAddress?.formattedAddress}</span>
              </div>
              {order.customerId?.phone && (
                <div className="flex items-center gap-1.5 text-xs text-[#7E808C]">
                  <Phone size={12} />
                  <span>{order.customerId.phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Chat with customer */}
          <Button
            variant="ghost"
            onClick={() => { setShowChat(true); setUnreadMessages(0); }}
            fullWidth
            className="relative"
          >
            <MessageCircle size={16} /> Chat with Customer
            {unreadMessages > 0 && (
              <span className="absolute top-1 right-2 w-5 h-5 bg-[#E23744] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </Button>

          {/* Action buttons */}
          {next && (
            <Button
              loading={isUpdating}
              onClick={() => handleUpdateStatus(next.status)}
              fullWidth
            >
              <CheckCircle size={16} /> {next.label}
            </Button>
          )}

          {order.status === 'delivered' && (
            <div className="bg-[#60B24618] border border-[#60B246] rounded-[8px] p-4 text-center">
              <CheckCircle size={24} className="text-[#60B246] mx-auto mb-2" />
              <p className="font-semibold text-[#60B246]">Delivery Complete!</p>
              <p className="text-xs text-[#7E808C] mt-1">Great job! Waiting for next delivery.</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat panel */}
      {showChat && (
        <ChatPanel
          orderId={order._id}
          title="Chat with Customer"
          recipientName={order.customerId?.name}
          onClose={() => setShowChat(false)}
        />
      )}
    </DashboardLayout>
  );
}
