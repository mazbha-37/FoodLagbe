import { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Eye, CheckCircle, XCircle, Store, Pause, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetRestaurantApplicationsQuery,
  useApproveRestaurantMutation,
  useRejectRestaurantMutation,
  useSuspendRestaurantMutation,
  useUnsuspendRestaurantMutation,
} from './adminApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_TABS = ['pending', 'approved', 'rejected'];

const BADGE_MAP = { pending: 'warning', approved: 'success', rejected: 'danger', suspended: 'neutral' };

function ReasonModal({ isOpen, onClose, onConfirm, loading, title, minLength = 10 }) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            loading={loading}
            disabled={reason.trim().length < minLength}
            onClick={() => onConfirm(reason)}
          >
            Confirm
          </Button>
        </>
      }
    >
      <div>
        <label className="text-sm font-medium text-[#1C1C1C] block mb-2">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder={`Minimum ${minLength} characters…`}
          className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744] resize-none"
        />
        <p className="text-xs text-[#7E808C] mt-1">{reason.trim().length}/{minLength} min characters</p>
      </div>
    </Modal>
  );
}

function DetailModal({ restaurant, isOpen, onClose, onApprove, onRejectClick, isApproving }) {
  if (!restaurant) return null;
  const coords = restaurant.location?.coordinates;
  const position = coords ? [coords[1], coords[0]] : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={restaurant.name}
      footer={
        restaurant.status === 'pending' ? (
          <>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="danger" onClick={onRejectClick}>Reject</Button>
            <Button variant="success" loading={isApproving} onClick={() => onApprove(restaurant._id)}>
              Approve
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="space-y-4 text-sm">
        {/* Cover photo */}
        {restaurant.coverPhoto?.url && (
          <img
            src={restaurant.coverPhoto.url}
            alt="Cover"
            className="w-full h-40 object-cover rounded-[6px] border border-[#E0E0E0]"
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Owner</p>
            <p className="font-medium text-[#1C1C1C]">{restaurant.ownerId?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Phone</p>
            <p className="font-medium text-[#1C1C1C]">{restaurant.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Cuisine</p>
            <p className="font-medium text-[#1C1C1C]">{restaurant.cuisineTypes?.join(', ') || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Applied</p>
            <p className="font-medium text-[#1C1C1C]">{new Date(restaurant.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-[#7E808C] mb-0.5">Address</p>
          <p className="text-[#1C1C1C]">{restaurant.address}</p>
        </div>

        {restaurant.description && (
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Description</p>
            <p className="text-[#1C1C1C]">{restaurant.description}</p>
          </div>
        )}

        {/* Trade license */}
        {restaurant.tradeLicense?.url && (
          <div>
            <p className="text-xs text-[#7E808C] mb-1">Trade License</p>
            <img
              src={restaurant.tradeLicense.url}
              alt="Trade License"
              className="w-full max-h-40 object-contain rounded border border-[#E0E0E0] bg-[#F9F9F9]"
            />
          </div>
        )}

        {/* Map */}
        {position && (
          <div>
            <p className="text-xs text-[#7E808C] mb-1">Location</p>
            <div className="rounded-[6px] overflow-hidden border border-[#E0E0E0]" style={{ height: 180 }}>
              <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={position} />
              </MapContainer>
            </div>
          </div>
        )}

        {restaurant.rejectionReason && (
          <div className="bg-[#FFF0F1] border border-[#E23744] rounded p-3">
            <p className="text-xs font-medium text-[#E23744] mb-1">Rejection Reason</p>
            <p className="text-sm text-[#1C1C1C]">{restaurant.rejectionReason}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function RestaurantApplications() {
  const [tab, setTab] = useState('pending');
  const [viewTarget, setViewTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useGetRestaurantApplicationsQuery({ status: tab, search });
  const [approveRestaurant, { isLoading: isApproving }] = useApproveRestaurantMutation();
  const [rejectRestaurant, { isLoading: isRejecting }] = useRejectRestaurantMutation();
  const [suspendRestaurant, { isLoading: isSuspending }] = useSuspendRestaurantMutation();
  const [unsuspendRestaurant, { isLoading: isUnsuspending }] = useUnsuspendRestaurantMutation();

  const restaurants = data?.restaurants || [];

  const handleApprove = async (id) => {
    try {
      await approveRestaurant(id).unwrap();
      toast.success('Restaurant approved');
      setViewTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (reason) => {
    try {
      await rejectRestaurant({ id: rejectTarget._id, reason }).unwrap();
      toast.success('Restaurant rejected');
      setRejectTarget(null);
      setViewTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reject');
    }
  };

  const handleSuspend = async (reason) => {
    try {
      await suspendRestaurant({ id: suspendTarget._id, reason }).unwrap();
      toast.success('Restaurant suspended');
      setSuspendTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to suspend');
    }
  };

  const handleUnsuspend = async (id) => {
    try {
      await unsuspendRestaurant(id).unwrap();
      toast.success('Restaurant unsuspended');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to unsuspend');
    }
  };

  return (
    <DashboardLayout title="Restaurant Applications">
      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2 text-xs font-medium capitalize transition-colors ${
                tab === t ? 'bg-[#E23744] text-white' : 'text-[#7E808C] hover:bg-[#F1F1F6]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'approved' && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants…"
            className="border border-[#E0E0E0] rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:border-[#E23744] w-full sm:w-60"
          />
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-20 text-sm text-[#7E808C]">No {tab} restaurants</div>
      ) : (
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E0E0E0]">
              <tr>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium">Restaurant</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden md:table-cell">Owner</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden lg:table-cell">Cuisine</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden md:table-cell">Date</th>
                <th className="text-right px-5 py-3 text-xs text-[#7E808C] font-medium">Status</th>
                <th className="text-right px-5 py-3 text-xs text-[#7E808C] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {restaurants.map((r) => (
                <tr key={r._id} className="hover:bg-[#F9F9F9]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {r.coverPhoto?.url ? (
                        <img src={r.coverPhoto.url} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-[#F1F1F6] flex items-center justify-center">
                          <Store size={14} className="text-[#7E808C]" />
                        </div>
                      )}
                      <span className="font-medium text-[#1C1C1C]">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[#7E808C] hidden md:table-cell">{r.ownerId?.name || '—'}</td>
                  <td className="px-5 py-3 text-[#7E808C] hidden lg:table-cell text-xs">{r.cuisineTypes?.slice(0, 2).join(', ')}</td>
                  <td className="px-5 py-3 text-[#7E808C] hidden md:table-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <Badge variant={BADGE_MAP[r.status] || 'neutral'}>{r.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewTarget(r)}
                        className="p-1.5 rounded hover:bg-[#F1F1F6] text-[#7E808C] hover:text-[#1C1C1C]"
                        title="View"
                      >
                        <Eye size={15} />
                      </button>
                      {tab === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(r._id)}
                            className="p-1.5 rounded hover:bg-[#60B24620] text-[#60B246]"
                            title="Approve"
                          >
                            <CheckCircle size={15} />
                          </button>
                          <button
                            onClick={() => { setRejectTarget(r); }}
                            className="p-1.5 rounded hover:bg-[#E2374420] text-[#E23744]"
                            title="Reject"
                          >
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                      {tab === 'approved' && r.status !== 'suspended' && (
                        <button
                          onClick={() => setSuspendTarget(r)}
                          className="p-1.5 rounded hover:bg-[#E2374420] text-[#E23744]"
                          title="Suspend"
                        >
                          <Pause size={15} />
                        </button>
                      )}
                      {r.status === 'suspended' && (
                        <button
                          onClick={() => handleUnsuspend(r._id)}
                          className="p-1.5 rounded hover:bg-[#60B24620] text-[#60B246]"
                          title="Unsuspend"
                        >
                          <Play size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DetailModal
        restaurant={viewTarget}
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        onApprove={handleApprove}
        onRejectClick={() => { setRejectTarget(viewTarget); }}
        isApproving={isApproving}
      />

      <ReasonModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        loading={isRejecting}
        title="Reject Restaurant"
        minLength={20}
      />

      <ReasonModal
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspend}
        loading={isSuspending}
        title="Suspend Restaurant"
        minLength={10}
      />
    </DashboardLayout>
  );
}
