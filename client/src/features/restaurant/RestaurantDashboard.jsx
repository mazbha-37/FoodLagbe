import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShoppingBag, DollarSign, Clock, Star, ChevronRight,
  UtensilsCrossed, AlertTriangle, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  useGetMyRestaurantQuery,
  useToggleStatusMutation,
  useGetRestaurantOrdersQuery,
} from './restaurantApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatRelativeDate } from '../../utils/formatDate';

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

function StatCard({ icon: Icon, label, value, color = '#E23744' }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-[#7E808C] text-xs">{label}</p>
        <p className="text-xl font-bold text-[#1C1C1C]">{value}</p>
      </div>
    </div>
  );
}

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetMyRestaurantQuery();
  const [toggleStatus, { isLoading: isToggling }] = useToggleStatusMutation();
  const { data: ordersData } = useGetRestaurantOrdersQuery({ limit: 5, page: 1 });

  const restaurant = data?.restaurant;

  const handleToggle = async () => {
    try {
      await toggleStatus(restaurant._id).unwrap();
      toast.success(restaurant.isOpen ? 'Restaurant is now closed' : 'Restaurant is now open!');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="text-center py-20">
          <UtensilsCrossed size={48} className="text-[#E0E0E0] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1C1C1C] mb-2">No Restaurant Yet</h2>
          <p className="text-sm text-[#7E808C] mb-6">Submit an application to get your restaurant listed on Food Lagbe.</p>
          <button
            onClick={() => navigate('/restaurant/application')}
            className="bg-[#E23744] hover:bg-[#c42f3a] text-white px-6 py-2.5 rounded-[8px] text-sm font-medium transition-colors"
          >
            Apply Now
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const orders = ordersData?.orders || [];
  const todayOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const todayRevenue = todayOrders.filter((o) => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0);
  const pendingCount = orders.filter((o) => o.status === 'placed').length;

  return (
    <DashboardLayout title="Dashboard">
      <div className="max-w-4xl space-y-6">
        {/* Open/Closed toggle */}
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-[#1C1C1C]">Restaurant Status</h3>
            <p className="text-sm text-[#7E808C] mt-0.5">
              {restaurant.isOpen
                ? 'Your restaurant is open and accepting orders.'
                : 'Your restaurant is closed. Toggle to start accepting orders.'}
            </p>
            {restaurant.isOpen && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-600">
                <AlertTriangle size={12} />
                <span>Outside business hours — orders may be limited</span>
              </div>
            )}
          </div>
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className="shrink-0 disabled:opacity-50 transition-opacity"
          >
            {restaurant.isOpen ? (
              <ToggleRight size={52} className="text-[#60B246]" />
            ) : (
              <ToggleLeft size={52} className="text-[#7E808C]" />
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={ShoppingBag} label="Today's Orders" value={todayOrders.length} color="#E23744" />
          <StatCard icon={DollarSign} label="Today's Revenue" value={formatCurrency(todayRevenue)} color="#60B246" />
          <StatCard icon={Clock} label="Pending Orders" value={pendingCount} color="#FC8019" />
          <StatCard icon={Star} label="Average Rating" value={restaurant.rating?.toFixed(1) || 'New'} color="#f59e0b" />
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-[8px] border border-[#E0E0E0]">
          <div className="px-5 py-4 border-b border-[#E0E0E0] flex items-center justify-between">
            <h3 className="font-semibold text-[#1C1C1C]">Recent Orders</h3>
            <button
              onClick={() => navigate('/restaurant/orders')}
              className="text-sm text-[#E23744] hover:underline flex items-center gap-1"
            >
              View all <ChevronRight size={14} />
            </button>
          </div>
          {orders.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#7E808C]">No orders yet</div>
          ) : (
            <div className="divide-y divide-[#E0E0E0]">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#F9F9F9] cursor-pointer"
                  onClick={() => navigate('/restaurant/orders')}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1C1C1C] truncate">
                      #{order._id?.slice(-6).toUpperCase()} — {order.customerId?.name || 'Customer'}
                    </p>
                    <p className="text-xs text-[#7E808C] mt-0.5">
                      {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''} ·{' '}
                      {formatRelativeDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-[#1C1C1C]">{formatCurrency(order.total || 0)}</span>
                    <Badge variant={STATUS_VARIANT[order.status] || 'neutral'}>
                      {order.status?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Manage Menu', desc: 'Add, edit, or remove menu items', path: '/restaurant/menu', icon: UtensilsCrossed },
            { label: 'View All Orders', desc: 'Accept, reject & track orders', path: '/restaurant/orders', icon: ShoppingBag },
            { label: 'Earnings', desc: 'View your revenue breakdown', path: '/restaurant/earnings', icon: DollarSign },
          ].map(({ label, desc, path, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 text-left hover:border-[#E23744] hover:shadow-sm transition-all group"
            >
              <Icon size={20} className="text-[#E23744] mb-2" />
              <p className="font-medium text-sm text-[#1C1C1C]">{label}</p>
              <p className="text-xs text-[#7E808C] mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
