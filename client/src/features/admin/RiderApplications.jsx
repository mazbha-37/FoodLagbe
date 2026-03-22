import { useState } from 'react';
import { Eye, CheckCircle, XCircle, User } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetRiderApplicationsQuery,
  useApproveRiderMutation,
  useRejectRiderMutation,
} from './adminApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const STATUS_TABS = ['pending', 'approved', 'rejected'];
const BADGE_MAP = { pending: 'warning', approved: 'success', rejected: 'danger' };

function ReasonModal({ isOpen, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject Rider Application"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} disabled={reason.trim().length < 20} onClick={() => onConfirm(reason)}>
            Reject
          </Button>
        </>
      }
    >
      <div>
        <label className="text-sm font-medium text-[#1C1C1C] block mb-2">Reason (min 20 chars)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744] resize-none"
        />
      </div>
    </Modal>
  );
}

function DetailModal({ rider, isOpen, onClose, onApprove, onRejectClick, isApproving }) {
  if (!rider) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={rider.userId?.name || 'Rider Details'}
      footer={
        rider.status === 'pending' ? (
          <>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="danger" onClick={onRejectClick}>Reject</Button>
            <Button variant="success" loading={isApproving} onClick={() => onApprove(rider._id)}>
              Approve
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="space-y-4 text-sm">
        {/* Profile photo */}
        {rider.profilePhoto?.url && (
          <div className="flex justify-center">
            <img
              src={rider.profilePhoto.url}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-2 border-[#E0E0E0]"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Name</p>
            <p className="font-medium text-[#1C1C1C]">{rider.userId?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Email</p>
            <p className="font-medium text-[#1C1C1C] truncate">{rider.userId?.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">NID Number</p>
            <p className="font-medium text-[#1C1C1C]">{rider.nidNumber || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Vehicle Type</p>
            <p className="font-medium text-[#1C1C1C] capitalize">{rider.vehicleType || '—'}</p>
          </div>
          {rider.vehicleRegNumber && (
            <div>
              <p className="text-xs text-[#7E808C] mb-0.5">Reg Number</p>
              <p className="font-medium text-[#1C1C1C]">{rider.vehicleRegNumber}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Applied</p>
            <p className="font-medium text-[#1C1C1C]">{new Date(rider.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* NID Photo */}
        {rider.nidPhoto?.url && (
          <div>
            <p className="text-xs text-[#7E808C] mb-1">NID Photo</p>
            <img
              src={rider.nidPhoto.url}
              alt="NID"
              className="w-full max-h-40 object-contain rounded border border-[#E0E0E0] bg-[#F9F9F9]"
            />
          </div>
        )}

        {/* Vehicle registration photo */}
        {rider.vehicleRegPhoto?.url && (
          <div>
            <p className="text-xs text-[#7E808C] mb-1">Vehicle Registration Photo</p>
            <img
              src={rider.vehicleRegPhoto.url}
              alt="Vehicle Reg"
              className="w-full max-h-40 object-contain rounded border border-[#E0E0E0] bg-[#F9F9F9]"
            />
          </div>
        )}

        {rider.rejectionReason && (
          <div className="bg-[#FFF0F1] border border-[#E23744] rounded p-3">
            <p className="text-xs font-medium text-[#E23744] mb-1">Rejection Reason</p>
            <p className="text-sm text-[#1C1C1C]">{rider.rejectionReason}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function RiderApplications() {
  const [tab, setTab] = useState('pending');
  const [viewTarget, setViewTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const { data, isLoading } = useGetRiderApplicationsQuery({ status: tab });
  const [approveRider, { isLoading: isApproving }] = useApproveRiderMutation();
  const [rejectRider, { isLoading: isRejecting }] = useRejectRiderMutation();

  const riders = data?.riders || [];

  const handleApprove = async (id) => {
    try {
      await approveRider(id).unwrap();
      toast.success('Rider approved');
      setViewTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (reason) => {
    try {
      await rejectRider({ id: rejectTarget._id, reason }).unwrap();
      toast.success('Rider rejected');
      setRejectTarget(null);
      setViewTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reject');
    }
  };

  return (
    <DashboardLayout title="Rider Applications">
      {/* Tabs */}
      <div className="flex bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden mb-5 w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-[#E23744] text-white' : 'text-[#7E808C] hover:bg-[#F1F1F6]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : riders.length === 0 ? (
        <div className="text-center py-20 text-sm text-[#7E808C]">No {tab} riders</div>
      ) : (
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E0E0E0]">
              <tr>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium">Rider</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden md:table-cell">NID</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden md:table-cell">Vehicle</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden lg:table-cell">Date</th>
                <th className="text-right px-5 py-3 text-xs text-[#7E808C] font-medium">Status</th>
                <th className="text-right px-5 py-3 text-xs text-[#7E808C] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {riders.map((r) => (
                <tr key={r._id} className="hover:bg-[#F9F9F9]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {r.profilePhoto?.url ? (
                        <img src={r.profilePhoto.url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#F1F1F6] flex items-center justify-center">
                          <User size={14} className="text-[#7E808C]" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[#1C1C1C]">{r.userId?.name || '—'}</p>
                        <p className="text-xs text-[#7E808C]">{r.userId?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[#7E808C] hidden md:table-cell">{r.nidNumber}</td>
                  <td className="px-5 py-3 text-[#7E808C] capitalize hidden md:table-cell">{r.vehicleType}</td>
                  <td className="px-5 py-3 text-[#7E808C] hidden lg:table-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <Badge variant={BADGE_MAP[r.status] || 'neutral'}>{r.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewTarget(r)} className="p-1.5 rounded hover:bg-[#F1F1F6] text-[#7E808C]" title="View">
                        <Eye size={15} />
                      </button>
                      {tab === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(r._id)} className="p-1.5 rounded hover:bg-[#60B24620] text-[#60B246]" title="Approve">
                            <CheckCircle size={15} />
                          </button>
                          <button onClick={() => setRejectTarget(r)} className="p-1.5 rounded hover:bg-[#E2374420] text-[#E23744]" title="Reject">
                            <XCircle size={15} />
                          </button>
                        </>
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
        rider={viewTarget}
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        onApprove={handleApprove}
        onRejectClick={() => setRejectTarget(viewTarget)}
        isApproving={isApproving}
      />
      <ReasonModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        loading={isRejecting}
      />
    </DashboardLayout>
  );
}
