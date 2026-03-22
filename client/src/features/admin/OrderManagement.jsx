import { useState } from 'react';
import { Search, Filter, X, ChevronRight, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetAdminOrdersQuery, useCancelAdminOrderMutation } from './adminApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import { formatCurrency } from '../../utils/formatCurrency';

const ALL_STATUSES = [
  'pending', 'accepted', 'preparing', 'ready_for_pickup',
  'picked_up', 'on_the_way', 'delivered', 'cancelled',
];

const STATUS_VARIANT = {
  pending: 'warning',
  accepted: 'info',
  preparing: 'warning',
  ready_for_pickup: 'success',
  picked_up: 'info',
  on_the_way: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

const NON_FINAL_STATUSES = ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'];

function CancelModal({ isOpen, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Order"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Back</Button>
          <Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={() => onConfirm(reason)}>
            Cancel Order
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#7E808C] mb-3">This action cannot be undone. Provide a reason:</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Reason for cancellation…"
        className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744] resize-none"
      />
    </Modal>
  );
}

function OrderDetailPanel({ order, onClose, onCancelClick }) {
  if (!order) return null;
  const canCancel = NON_FINAL_STATUSES.includes(order.status);

  return (
    <div className="lg:w-96 bg-white border border-[#E0E0E0] rounded-[8px] flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0E0E0]">
        <h3 className="font-semibold text-[#1C1C1C]">
          Order #{order._id?.slice(-6).toUpperCase()}
        </h3>
        <button onClick={onClose} className="text-[#7E808C] hover:text-[#1C1C1C]">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <Badge variant={STATUS_VARIANT[order.status] || 'neutral'}>
            {order.status?.replace(/_/g, ' ')}
          </Badge>
          <span className="font-bold text-[#1C1C1C] text-base">{formatCurrency(order.total || 0)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Customer</p>
            <p className="font-medium text-[#1C1C1C]">{order.customerId?.name || '—'}</p>
            <p className="text-xs text-[#7E808C]">{order.customerId?.phone}</p>
          </div>
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Restaurant</p>
            <p className="font-medium text-[#1C1C1C]">{order.restaurantId?.name || '—'}</p>
          </div>
          {order.riderId && (
            <div>
              <p className="text-xs text-[#7E808C] mb-0.5">Rider</p>
              <p className="font-medium text-[#1C1C1C]">{order.riderId?.name || '—'}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Payment</p>
            <p className="font-medium text-[#1C1C1C] capitalize">{order.paymentMethod || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-[#7E808C] mb-0.5">Date</p>
            <p className="font-medium text-[#1C1C1C]">
              {new Date(order.createdAt).toLocaleString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Items */}
        <div>
          <p className="text-xs text-[#7E808C] mb-2">Items</p>
          <div className="space-y-2 bg-[#F9F9F9] rounded-[6px] p-3">
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[#1C1C1C]">
                  <span className="font-medium">{item.quantity}×</span> {item.menuItemId?.name || 'Item'}
                </span>
                <span className="text-[#7E808C]">{formatCurrency((item.price || 0) * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-[#E0E0E0] pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.total || 0)}</span>
            </div>
          </div>
        </div>

        {/* Delivery address */}
        {order.deliveryAddress && (
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Delivery Address</p>
            <p className="text-[#1C1C1C]">
              {order.deliveryAddress.address || order.deliveryAddress.formattedAddress || '—'}
            </p>
          </div>
        )}

        {order.cancellation?.reason && (
          <div className="bg-[#FFF0F1] border border-[#E23744] rounded p-3">
            <p className="text-xs font-medium text-[#E23744] mb-1">Cancellation Reason</p>
            <p className="text-xs text-[#1C1C1C]">{order.cancellation.reason}</p>
          </div>
        )}
      </div>

      {canCancel && (
        <div className="p-4 border-t border-[#E0E0E0]">
          <Button variant="danger" fullWidth onClick={onCancelClick}>
            <XCircle size={16} /> Cancel Order
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminOrderManagement() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data, isLoading } = useGetAdminOrdersQuery({
    page,
    limit: 15,
    status: statusFilter || undefined,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const [cancelAdminOrder, { isLoading: isCancelling }] = useCancelAdminOrderMutation();

  const orders = data?.orders || [];

  const handleCancel = async (reason) => {
    try {
      await cancelAdminOrder({ id: cancelTarget._id, reason }).unwrap();
      toast.success('Order cancelled');
      setCancelTarget(null);
      if (selectedOrder?._id === cancelTarget._id) setSelectedOrder(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to cancel order');
    }
  };

  return (
    <DashboardLayout title="Order Management">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7E808C]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Order # or customer…"
            className="pl-9 pr-3 py-2 border border-[#E0E0E0] rounded-[6px] text-sm focus:outline-none focus:border-[#E23744] w-52"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-[#E0E0E0] rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:border-[#E23744]"
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-[#E0E0E0] rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:border-[#E23744]"
          />
          <span className="text-[#7E808C] text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-[#E0E0E0] rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:border-[#E23744]"
          />
        </div>
        {(statusFilter || search || dateFrom || dateTo) && (
          <button
            onClick={() => { setStatusFilter(''); setSearch(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="flex items-center gap-1 text-sm text-[#7E808C] hover:text-[#E23744]"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <div className={`flex gap-4 ${selectedOrder ? 'flex-col lg:flex-row' : ''}`}>
        {/* Orders table */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 text-sm text-[#7E808C]">No orders found</div>
          ) : (
            <>
              <div className="bg-white rounded-[8px] border border-[#E0E0E0] overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#E0E0E0]">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs text-[#7E808C] font-medium">Order</th>
                      <th className="text-left px-4 py-3 text-xs text-[#7E808C] font-medium hidden md:table-cell">Customer</th>
                      <th className="text-left px-4 py-3 text-xs text-[#7E808C] font-medium hidden lg:table-cell">Restaurant</th>
                      <th className="text-left px-4 py-3 text-xs text-[#7E808C] font-medium hidden xl:table-cell">Rider</th>
                      <th className="text-right px-4 py-3 text-xs text-[#7E808C] font-medium">Total</th>
                      <th className="text-right px-4 py-3 text-xs text-[#7E808C] font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-xs text-[#7E808C] font-medium hidden lg:table-cell">Payment</th>
                      <th className="text-left px-4 py-3 text-xs text-[#7E808C] font-medium hidden md:table-cell">Date</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0]">
                    {orders.map((o) => (
                      <tr
                        key={o._id}
                        className={`hover:bg-[#F9F9F9] cursor-pointer ${selectedOrder?._id === o._id ? 'bg-[#FFF0F1]' : ''}`}
                        onClick={() => setSelectedOrder(selectedOrder?._id === o._id ? null : o)}
                      >
                        <td className="px-4 py-3 font-medium text-[#1C1C1C]">
                          #{o._id?.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-[#7E808C] hidden md:table-cell">
                          {o.customerId?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-[#7E808C] hidden lg:table-cell">
                          {o.restaurantId?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-[#7E808C] hidden xl:table-cell">
                          {o.riderId?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1C1C1C]">
                          {formatCurrency(o.total || 0)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={STATUS_VARIANT[o.status] || 'neutral'}>
                            {o.status?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[#7E808C] capitalize hidden lg:table-cell">
                          {o.paymentMethod || '—'}
                        </td>
                        <td className="px-4 py-3 text-[#7E808C] hidden md:table-cell">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-[#7E808C]">
                          <ChevronRight size={15} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data?.pages > 1 && (
                <div className="mt-4">
                  <Pagination
                    page={page}
                    totalPages={data.pages}
                    total={data.total}
                    limit={15}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selectedOrder && (
          <OrderDetailPanel
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onCancelClick={() => setCancelTarget(selectedOrder)}
          />
        )}
      </div>

      <CancelModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={isCancelling}
      />
    </DashboardLayout>
  );
}
