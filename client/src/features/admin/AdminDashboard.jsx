import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Users, Store, ShoppingBag, DollarSign, Truck,
  ClipboardList, AlertCircle, Tag,
} from 'lucide-react';
import { useGetAdminStatsQuery } from './adminApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';

const STATUS_COLORS = {
  pending: '#FC8019',
  accepted: '#3B82F6',
  preparing: '#A855F7',
  ready_for_pickup: '#60B246',
  picked_up: '#06B6D4',
  delivered: '#60B246',
  cancelled: '#E23744',
};

function StatCard({ icon: Icon, label, value, sub, color = '#E23744', onClick }) {
  return (
    <div
      className={`bg-white rounded-[8px] border border-[#E0E0E0] p-4 ${onClick ? 'cursor-pointer hover:border-[#E23744] transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${color}15` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <p className="text-sm text-[#7E808C]">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#1C1C1C]">{value}</p>
      {sub && <p className="text-xs text-[#7E808C] mt-1">{sub}</p>}
    </div>
  );
}

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-[6px] px-3 py-2 shadow-sm text-sm">
      <p className="font-medium capitalize">{payload[0]?.name?.replace(/_/g, ' ')}</p>
      <p className="text-[#7E808C]">{payload[0]?.value} orders</p>
    </div>
  );
};

const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-[6px] px-3 py-2 shadow-sm text-sm">
      <p className="text-[#7E808C] mb-1">{label}</p>
      <p className="font-semibold text-[#E23744]">{formatCurrency(payload[0]?.value || 0)}</p>
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetAdminStatsQuery();

  const stats = data?.stats || {};
  const ordersByStatus = data?.ordersByStatus || [];
  const revenueChart = data?.revenueChart || [];

  return (
    <DashboardLayout title="Admin Dashboard">
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6 max-w-6xl">
          {/* Stats grid — row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Total Users"
              value={stats.totalUsers ?? 0}
              color="#E23744"
              onClick={() => navigate('/admin/customers')}
            />
            <StatCard
              icon={Store}
              label="Active Restaurants"
              value={stats.activeRestaurants ?? 0}
              color="#FC8019"
              onClick={() => navigate('/admin/restaurants')}
            />
            <StatCard
              icon={ShoppingBag}
              label="Today's Orders"
              value={stats.todayOrders ?? 0}
              color="#60B246"
              onClick={() => navigate('/admin/orders')}
            />
            <StatCard
              icon={DollarSign}
              label="Today's Revenue"
              value={formatCurrency(stats.todayRevenue ?? 0)}
              color="#3B82F6"
            />
          </div>

          {/* Stats grid — row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Truck}
              label="Active Riders"
              value={stats.activeRiders ?? 0}
              color="#A855F7"
              onClick={() => navigate('/admin/riders')}
            />
            <StatCard
              icon={ClipboardList}
              label="Pending Applications"
              value={(stats.pendingRestaurants ?? 0) + (stats.pendingRiders ?? 0)}
              sub={`${stats.pendingRestaurants ?? 0} restaurants · ${stats.pendingRiders ?? 0} riders`}
              color="#FC8019"
            />
            <StatCard
              icon={AlertCircle}
              label="Open Complaints"
              value={stats.openComplaints ?? 0}
              color="#E23744"
              onClick={() => navigate('/admin/complaints')}
            />
            <StatCard
              icon={DollarSign}
              label="Monthly Revenue"
              value={formatCurrency(stats.monthlyRevenue ?? 0)}
              color="#60B246"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Orders by status pie */}
            {ordersByStatus.length > 0 && (
              <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-5">
                <h3 className="font-semibold text-[#1C1C1C] mb-4">Orders by Status</h3>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={ordersByStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                      >
                        {ordersByStatus.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] || '#7E808C'}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {ordersByStatus.map((entry) => (
                      <div key={entry.status} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: STATUS_COLORS[entry.status] || '#7E808C' }}
                        />
                        <span className="text-[#7E808C] capitalize flex-1">{entry.status?.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-[#1C1C1C]">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Revenue line chart */}
            {revenueChart.length > 0 && (
              <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-5">
                <h3 className="font-semibold text-[#1C1C1C] mb-4">Revenue — Last 30 Days</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={revenueChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F6" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#7E808C' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#7E808C' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `৳${v}`}
                      width={50}
                    />
                    <RechartsTooltip content={<LineTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#E23744"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#E23744' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-[#7E808C] uppercase tracking-wide mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { to: '/admin/restaurants', icon: Store, label: 'Restaurant Apps', color: '#FC8019' },
                { to: '/admin/riders', icon: Truck, label: 'Rider Apps', color: '#A855F7' },
                { to: '/admin/complaints', icon: AlertCircle, label: 'Complaints', color: '#E23744' },
                { to: '/admin/coupons', icon: Tag, label: 'Coupons', color: '#3B82F6' },
              ].map(({ to, icon: Icon, label, color }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="bg-white border border-[#E0E0E0] rounded-[8px] p-4 text-left hover:border-[#E23744] transition-colors"
                >
                  <Icon size={20} style={{ color }} className="mb-2" />
                  <p className="text-sm font-medium text-[#1C1C1C]">{label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
