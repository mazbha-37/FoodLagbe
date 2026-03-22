import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Package, TrendingUp, Star } from 'lucide-react';
import { useGetRiderEarningsQuery } from './riderApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

function StatCard({ icon: Icon, label, value, sub, color = '#E23744' }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4">
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-[6px] px-3 py-2 shadow-sm text-sm">
      <p className="text-[#7E808C] mb-1">{label}</p>
      <p className="font-semibold text-[#E23744]">{formatCurrency(payload[0]?.value || 0)}</p>
    </div>
  );
};

export default function RiderEarningsPage() {
  const [period, setPeriod] = useState('week');
  const { data: earningsData, isLoading } = useGetRiderEarningsQuery({ period });

  const stats = earningsData?.stats || {};
  const chartData = earningsData?.chartData || [];
  const recentDeliveries = earningsData?.recentDeliveries || [];

  return (
    <DashboardLayout title="Earnings">
      <div className="max-w-4xl space-y-6">
        {/* Period selector */}
        <div className="flex gap-2">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                period === value
                  ? 'bg-[#E23744] text-white border-[#E23744]'
                  : 'border-[#E0E0E0] text-[#7E808C] hover:border-[#E23744]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={DollarSign}
                label="Total Earnings"
                value={formatCurrency(stats.totalEarnings || 0)}
                color="#E23744"
              />
              <StatCard
                icon={Package}
                label="Deliveries"
                value={stats.totalDeliveries || 0}
                color="#FC8019"
              />
              <StatCard
                icon={TrendingUp}
                label="Avg. per Delivery"
                value={formatCurrency(stats.avgEarning || 0)}
                color="#60B246"
              />
              <StatCard
                icon={Star}
                label="Avg. Rating"
                value={stats.avgRating ? stats.avgRating.toFixed(1) : '—'}
                sub="Customer rating"
                color="#7E808C"
              />
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-5">
                <h3 className="font-semibold text-[#1C1C1C] mb-4">Earnings Over Time</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F6" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: '#7E808C' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#7E808C' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `৳${v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="earnings" fill="#E23744" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent deliveries */}
            <div className="bg-white rounded-[8px] border border-[#E0E0E0]">
              <div className="px-5 py-4 border-b border-[#E0E0E0]">
                <h3 className="font-semibold text-[#1C1C1C]">Recent Deliveries</h3>
              </div>
              {recentDeliveries.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-[#7E808C]">
                  No deliveries in this period
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E0E0E0]">
                        <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium">Order</th>
                        <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium">Restaurant</th>
                        <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium">Date</th>
                        <th className="text-right px-5 py-3 text-xs text-[#7E808C] font-medium">Earning</th>
                        <th className="text-right px-5 py-3 text-xs text-[#7E808C] font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E0E0]">
                      {recentDeliveries.map((d) => (
                        <tr key={d._id} className="hover:bg-[#F9F9F9]">
                          <td className="px-5 py-3 font-medium text-[#1C1C1C]">
                            #{d._id?.slice(-6).toUpperCase()}
                          </td>
                          <td className="px-5 py-3 text-[#7E808C]">
                            {d.restaurantId?.name || 'N/A'}
                          </td>
                          <td className="px-5 py-3 text-[#7E808C]">
                            {new Date(d.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-[#1C1C1C]">
                            {formatCurrency(d.deliveryFee || 0)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Badge variant={d.status === 'delivered' ? 'success' : 'danger'}>
                              {d.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
