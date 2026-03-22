import { useNavigate } from 'react-router-dom';
import { ToggleRight, ToggleLeft, Package, DollarSign, Star, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetMyRiderQuery, useToggleRiderAvailabilityMutation, useGetActiveDeliveryQuery } from './riderApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';

function StatCard({ icon: Icon, label, value, color = '#E23744' }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-4">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${color}18` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <p className="text-sm text-[#7E808C]">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[#1C1C1C]">{value}</p>
    </div>
  );
}

export default function RiderDashboard() {
  const navigate = useNavigate();
  const { data: riderData, isLoading } = useGetMyRiderQuery();
  const { data: deliveryData } = useGetActiveDeliveryQuery();
  const [toggleAvailability, { isLoading: isToggling }] = useToggleRiderAvailabilityMutation();

  const rider = riderData?.rider;
  const activeDelivery = deliveryData?.order;

  const handleToggle = async () => {
    try {
      await toggleAvailability().unwrap();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update availability');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Rider Dashboard">
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  // Rider hasn't submitted application yet
  if (!rider) {
    return (
      <DashboardLayout title="Rider Dashboard">
        <div className="text-center py-20">
          <Truck size={48} className="text-[#E0E0E0] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1C1C1C] mb-2">Complete Your Application</h2>
          <p className="text-sm text-[#7E808C] mb-6">Submit your rider application to start delivering with Food Lagbe.</p>
          <button
            onClick={() => navigate('/rider/application')}
            className="bg-[#E23744] hover:bg-[#c42f3a] text-white px-6 py-2.5 rounded-[8px] text-sm font-medium transition-colors"
          >
            Apply Now
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Application pending
  if (rider.applicationStatus === 'pending') {
    return (
      <DashboardLayout title="Rider Dashboard">
        <div className="text-center py-20">
          <Package size={48} className="text-[#FC8019] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1C1C1C] mb-2">Application Under Review</h2>
          <p className="text-sm text-[#7E808C]">Your rider application is being reviewed. We'll notify you once it's approved.</p>
        </div>
      </DashboardLayout>
    );
  }

  // Application rejected
  if (rider.applicationStatus === 'rejected') {
    return (
      <DashboardLayout title="Rider Dashboard">
        <div className="text-center py-20">
          <Truck size={48} className="text-[#E23744] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1C1C1C] mb-2">Application Rejected</h2>
          <p className="text-sm text-[#7E808C] mb-2">{rider.rejectionReason || 'Your application was not approved.'}</p>
          <button
            onClick={() => navigate('/rider/application')}
            className="bg-[#E23744] hover:bg-[#c42f3a] text-white px-6 py-2.5 rounded-[8px] text-sm font-medium transition-colors mt-4"
          >
            Reapply
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const stats = rider?.todayStats || {};

  return (
    <DashboardLayout title="Rider Dashboard">
      <div className="max-w-2xl space-y-6">
        {/* Availability toggle */}
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#1C1C1C] text-lg">Availability</h2>
              <p className="text-sm text-[#7E808C] mt-1">
                {rider?.isAvailable
                  ? 'You are available to receive delivery requests'
                  : 'You are currently offline'}
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={isToggling}
              className="transition-transform hover:scale-105 disabled:opacity-60"
              aria-label="Toggle availability"
            >
              {rider?.isAvailable ? (
                <ToggleRight size={56} className="text-[#60B246]" />
              ) : (
                <ToggleLeft size={56} className="text-[#7E808C]" />
              )}
            </button>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: rider?.isAvailable ? '#60B24618' : '#7E808C18',
              color: rider?.isAvailable ? '#60B246' : '#7E808C',
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${rider?.isAvailable ? 'bg-[#60B246]' : 'bg-[#7E808C]'}`} />
            {rider?.isAvailable ? 'Available' : 'Offline'}
          </div>
        </div>

        {/* Active delivery banner */}
        {activeDelivery && (
          <div className="bg-[#E237440D] border border-[#E23744] rounded-[8px] p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E23744] flex items-center justify-center shrink-0">
                <Truck size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1C1C1C]">Active Delivery</p>
                <p className="text-sm text-[#7E808C] mt-0.5 truncate">
                  Order #{activeDelivery._id?.slice(-6).toUpperCase()} · {activeDelivery.restaurantId?.name}
                </p>
                <p className="text-xs text-[#7E808C] mt-0.5">
                  Status: <span className="capitalize font-medium text-[#1C1C1C]">{activeDelivery.status?.replace(/_/g, ' ')}</span>
                </p>
              </div>
              <Button size="sm" onClick={() => navigate('/rider/delivery')}>
                Go
              </Button>
            </div>
          </div>
        )}

        {/* Today's stats */}
        <div>
          <h3 className="text-sm font-semibold text-[#7E808C] uppercase tracking-wide mb-3">Today's Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={Package}
              label="Deliveries"
              value={stats.deliveries ?? 0}
              color="#FC8019"
            />
            <StatCard
              icon={DollarSign}
              label="Earnings"
              value={formatCurrency(stats.earnings ?? 0)}
              color="#60B246"
            />
            <StatCard
              icon={Star}
              label="Rating"
              value={rider?.rating ? rider.rating.toFixed(1) : '—'}
              color="#E23744"
            />
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/rider/delivery')}
            className="bg-white border border-[#E0E0E0] rounded-[8px] p-4 text-left hover:border-[#E23744] transition-colors"
          >
            <Truck size={20} className="text-[#E23744] mb-2" />
            <p className="text-sm font-medium text-[#1C1C1C]">Active Delivery</p>
            <p className="text-xs text-[#7E808C] mt-0.5">View current delivery</p>
          </button>
          <button
            onClick={() => navigate('/rider/history')}
            className="bg-white border border-[#E0E0E0] rounded-[8px] p-4 text-left hover:border-[#E23744] transition-colors"
          >
            <Package size={20} className="text-[#FC8019] mb-2" />
            <p className="text-sm font-medium text-[#1C1C1C]">Delivery History</p>
            <p className="text-xs text-[#7E808C] mt-0.5">View past deliveries</p>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
