import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Package, ChevronRight } from 'lucide-react';
import { useGetOrdersQuery } from './customerApi';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

const TABS = [
  { key: 'active', label: 'Active', statuses: 'placed,accepted,preparing,ready_for_pickup,picked_up,on_the_way' },
  { key: 'completed', label: 'Completed', statuses: 'delivered' },
  { key: 'cancelled', label: 'Cancelled', statuses: 'cancelled' },
];

const STATUS_BADGE = {
  placed: { label: 'Placed', variant: 'neutral' },
  accepted: { label: 'Accepted', variant: 'info' },
  preparing: { label: 'Preparing', variant: 'warning' },
  ready_for_pickup: { label: 'Ready', variant: 'info' },
  picked_up: { label: 'Picked Up', variant: 'info' },
  on_the_way: { label: 'On the Way', variant: 'secondary' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

function OrderCard({ order }) {
  const navigate = useNavigate();
  const badge = STATUS_BADGE[order.status] || { label: order.status, variant: 'neutral' };

  return (
    <div
      onClick={() => navigate(`/orders/${order._id}`)}
      className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Restaurant photo */}
        <div className="w-14 h-14 rounded-[6px] overflow-hidden shrink-0 bg-gray-100">
          {order.restaurantId?.coverPhoto?.url ? (
            <img src={order.restaurantId.coverPhoto.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#1C1C1C] truncate">
                {order.restaurantId?.name || 'Restaurant'}
              </h3>
              <p className="text-xs text-[#7E808C] mt-0.5">
                Order #{order.orderNumber} · {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-xs text-[#7E808C]">
              <Clock size={12} />
              {formatDateTime(order.createdAt)}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-[#1C1C1C]">{formatCurrency(order.total)}</span>
              <ChevronRight size={16} className="text-[#7E808C]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderHistoryPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [page, setPage] = useState(1);
  const tab = TABS.find((t) => t.key === activeTab);

  const { data, isLoading } = useGetOrdersQuery({
    status: tab.statuses,
    page,
    limit: 10,
  });

  const orders = data?.orders || [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-[#1C1C1C] mb-5">My Orders</h1>

      {/* Tabs */}
      <div className="flex bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setPage(1); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-[#E23744] text-white'
                : 'text-[#7E808C] hover:bg-[#F1F1F6]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="text-[#E0E0E0] mx-auto mb-3" />
          <p className="text-sm text-[#7E808C]">No {activeTab} orders</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((o) => <OrderCard key={o._id} order={o} />)}
          </div>
          <Pagination
            page={page}
            totalPages={data?.pages || 1}
            total={data?.total || 0}
            limit={10}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
