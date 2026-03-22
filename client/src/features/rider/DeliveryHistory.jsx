import { useState } from 'react';
import { MapPin, Store } from 'lucide-react';
import { useGetDeliveryHistoryQuery } from './riderApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import { formatCurrency } from '../../utils/formatCurrency';

export default function DeliveryHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetDeliveryHistoryQuery({ page, limit: 10 });

  const deliveries = data?.deliveries || [];

  return (
    <DashboardLayout title="Delivery History">
      <div className="max-w-3xl">
        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-20 text-[#7E808C]">
            <p className="text-sm">No delivery history yet</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-[8px] border border-[#E0E0E0]">
              {deliveries.map((d) => (
                <div
                  key={d._id}
                  className="flex items-center justify-between px-5 py-4 border-b border-[#E0E0E0] last:border-0 gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#1C1C1C]">
                        #{d._id?.slice(-6).toUpperCase()}
                      </p>
                      <Badge variant={d.status === 'delivered' ? 'success' : 'danger'}>
                        {d.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#7E808C]">
                      <span className="flex items-center gap-1">
                        <Store size={11} /> {d.restaurantId?.name || 'Restaurant'}
                      </span>
                      <span>→</span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin size={11} /> {d.customerId?.name || 'Customer'}
                      </span>
                    </div>
                    <p className="text-xs text-[#7E808C] mt-0.5">
                      {new Date(d.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#1C1C1C]">
                      {formatCurrency(d.deliveryFee || 0)}
                    </p>
                    {d.deliveryDistance != null && (
                      <p className="text-xs text-[#7E808C] mt-0.5">{d.deliveryDistance.toFixed(1)} km</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {data?.pages > 1 && (
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
      </div>
    </DashboardLayout>
  );
}
