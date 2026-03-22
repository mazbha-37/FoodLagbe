import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle, ChevronRight, User, Bike } from 'lucide-react';
import { useGetRestaurantOrdersQuery, useUpdateOrderStatusMutation } from './restaurantApi';
import { apiSlice } from '../../app/api';
import { getSocket } from '../../socket/socketClient';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import { formatCurrency } from '../../utils/formatCurrency';

const TABS = ['new', 'active', 'completed', 'cancelled'];

const STATUS_VARIANT = {
  placed: 'warning',
  accepted: 'info',
  preparing: 'warning',
  ready_for_pickup: 'success',
  picked_up: 'info',
  on_the_way: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function LiveTime({ date }) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);
  return <span>{formatDistanceToNow(new Date(date), { addSuffix: true })}</span>;
}

function RejectModal({ isOpen, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject Order"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={() => onConfirm(reason)} disabled={!reason.trim()}>
            Reject Order
          </Button>
        </>
      }
    >
      <div>
        <label className="text-sm font-medium text-[#1C1C1C] block mb-2">Reason for rejection</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Item out of stock, cannot fulfill order at this time..."
          className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744] resize-none"
        />
      </div>
    </Modal>
  );
}

function OrderCard({ order, onAccept, onReject, isAccepting, isRejecting }) {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-[8px] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#1C1C1C] text-sm">#{order._id?.slice(-6).toUpperCase()}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-[#7E808C]">
            <User size={12} />
            <span>{order.customerId?.name || 'Customer'}</span>
            <span>·</span>
            <LiveTime date={order.createdAt} />
          </div>
        </div>
        <span className="text-sm font-bold text-[#1C1C1C] shrink-0">{formatCurrency(order.total || 0)}</span>
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {order.items?.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-2 text-sm">
            <span className="text-[#1C1C1C]">
              <span className="font-medium">{item.quantity}×</span> {item.menuItemId?.name || item.name || 'Item'}
            </span>
            {item.specialInstructions && (
              <span className="text-xs text-[#7E808C] italic shrink-0">"{item.specialInstructions}"</span>
            )}
          </div>
        ))}
      </div>

      {order.orderInstructions && (
        <p className="text-xs text-[#7E808C] bg-[#F9F9F9] rounded p-2">
          <span className="font-medium">Note:</span> {order.orderInstructions}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          variant="success"
          size="sm"
          loading={isAccepting}
          onClick={() => onAccept(order._id)}
          className="flex-1"
        >
          <CheckCircle size={14} /> Accept
        </Button>
        <Button
          variant="danger"
          size="sm"
          loading={isRejecting}
          onClick={() => onReject(order)}
          className="flex-1"
        >
          <XCircle size={14} /> Reject
        </Button>
      </div>
    </div>
  );
}

function ActiveOrderCard({ order, onUpdateStatus, isUpdating }) {
  const nextStatus = {
    accepted: { label: 'Start Preparing', next: 'preparing' },
    preparing: { label: 'Ready for Pickup', next: 'ready_for_pickup' },
  };
  const action = nextStatus[order.status];

  return (
    <div className="bg-white border border-[#E0E0E0] rounded-[8px] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-[#1C1C1C] text-sm">#{order._id?.slice(-6).toUpperCase()}</p>
          <p className="text-xs text-[#7E808C] mt-0.5">{order.customerId?.name || 'Customer'}</p>
        </div>
        <Badge variant={STATUS_VARIANT[order.status] || 'neutral'}>
          {order.status?.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="text-sm text-[#7E808C] space-y-0.5">
        {order.items?.map((item, i) => (
          <p key={i}>{item.quantity}× {item.menuItemId?.name || 'Item'}</p>
        ))}
      </div>

      {order.riderId && (
        <div className="flex items-center gap-2 text-xs text-[#7E808C] bg-[#F1F1F6] rounded p-2">
          <Bike size={12} />
          <span>Rider: {order.riderId?.name || 'Assigned'}</span>
        </div>
      )}

      {action && (
        <Button
          size="sm"
          loading={isUpdating}
          onClick={() => onUpdateStatus(order._id, action.next)}
          fullWidth
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

function CompletedRow({ order }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#E0E0E0] last:border-0">
      <div>
        <p className="text-sm font-medium text-[#1C1C1C]">#{order._id?.slice(-6).toUpperCase()}</p>
        <p className="text-xs text-[#7E808C]">{order.customerId?.name} · {new Date(order.createdAt).toLocaleDateString()}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{formatCurrency(order.total || 0)}</span>
        <Badge variant={STATUS_VARIANT[order.status] || 'neutral'}>{order.status}</Badge>
      </div>
    </div>
  );
}

export default function OrderManagement() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('new');
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [newOrders, setNewOrders] = useState([]);

  const statusMap = {
    new: 'placed',
    active: 'accepted,preparing,ready_for_pickup',
    completed: 'delivered',
    cancelled: 'cancelled',
  };

  const { data, isLoading, error } = useGetRestaurantOrdersQuery(
    { status: statusMap[activeTab], page, limit: activeTab === 'new' ? 20 : 10 },
    { pollingInterval: activeTab === 'new' ? 10000 : 0 }
  );

  const [updateOrderStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const [actionTarget, setActionTarget] = useState(null); // { id, action }

  const orders = activeTab === 'new'
    ? [...newOrders, ...(data?.orders || [])].filter((o, i, a) => a.findIndex((x) => x._id === o._id) === i)
    : (data?.orders || []);

  // Socket — listen for new_order
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (order) => {
      setNewOrders((prev) => {
        if (prev.find((o) => o._id === order._id)) return prev;
        playBeep();
        toast.success('New order received!', { duration: 5000 });
        return [order, ...prev];
      });
      dispatch(apiSlice.util.invalidateTags(['Order']));
    };
    socket.on('new_order', handler);
    return () => socket.off('new_order', handler);
  }, [dispatch]);

  const handleAccept = async (orderId) => {
    setActionTarget({ id: orderId, action: 'accept' });
    try {
      await updateOrderStatus({ id: orderId, status: 'accepted' }).unwrap();
      setNewOrders((prev) => prev.filter((o) => o._id !== orderId));
      toast.success('Order accepted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to accept');
    } finally {
      setActionTarget(null);
    }
  };

  const handleReject = async (reason) => {
    if (!rejectTarget) return;
    setActionTarget({ id: rejectTarget._id, action: 'reject' });
    try {
      await updateOrderStatus({ id: rejectTarget._id, status: 'cancelled', reason }).unwrap();
      setNewOrders((prev) => prev.filter((o) => o._id !== rejectTarget._id));
      toast.success('Order rejected');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reject');
    } finally {
      setActionTarget(null);
      setRejectTarget(null);
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    setActionTarget({ id: orderId, action: status });
    try {
      await updateOrderStatus({ id: orderId, status }).unwrap();
      toast.success('Status updated');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update');
    } finally {
      setActionTarget(null);
    }
  };

  return (
    <DashboardLayout title="Order Management">
      {/* Tabs */}
      <div className="flex bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden mb-5">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors relative ${
              activeTab === tab ? 'bg-[#E23744] text-white' : 'text-[#7E808C] hover:bg-[#F1F1F6]'
            }`}
          >
            {tab}
            {tab === 'new' && newOrders.length > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-white text-[#E23744] text-[10px] font-bold rounded-full flex items-center justify-center">
                {newOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : error ? (
        <div className="text-center py-16 text-[#E23744]">
          <p className="text-sm font-medium">Failed to load orders</p>
          <p className="text-xs mt-1 text-[#7E808C]">{error?.data?.message || 'Please try refreshing the page'}</p>
        </div>
      ) : (
        <>
          {/* NEW tab */}
          {activeTab === 'new' && (
            <div>
              {orders.length === 0 ? (
                <div className="text-center py-16 text-[#7E808C]">
                  <p className="text-sm">No new orders right now</p>
                  <p className="text-xs mt-1">New orders will appear here automatically</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.map((order) => (
                    <OrderCard
                      key={order._id}
                      order={order}
                      onAccept={handleAccept}
                      onReject={(o) => setRejectTarget(o)}
                      isAccepting={actionTarget?.id === order._id && actionTarget.action === 'accept'}
                      isRejecting={actionTarget?.id === order._id && actionTarget.action === 'reject'}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACTIVE tab */}
          {activeTab === 'active' && (
            <div>
              {orders.length === 0 ? (
                <div className="text-center py-16 text-sm text-[#7E808C]">No active orders</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.map((order) => (
                    <ActiveOrderCard
                      key={order._id}
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      isUpdating={actionTarget?.id === order._id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COMPLETED / CANCELLED tabs */}
          {(activeTab === 'completed' || activeTab === 'cancelled') && (
            <div className="bg-white rounded-[8px] border border-[#E0E0E0]">
              {orders.length === 0 ? (
                <div className="text-center py-16 text-sm text-[#7E808C]">No {activeTab} orders</div>
              ) : (
                orders.map((order) => <CompletedRow key={order._id} order={order} />)
              )}
            </div>
          )}

          {/* Pagination for completed/cancelled */}
          {(activeTab === 'completed' || activeTab === 'cancelled') && data?.pages > 1 && (
            <div className="mt-4">
              <Pagination
                page={page}
                totalPages={data.pages}
                total={data.total}
                limit={10}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      <RejectModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        loading={actionTarget?.action === 'reject'}
      />
    </DashboardLayout>
  );
}
