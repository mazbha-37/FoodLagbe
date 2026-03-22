import { useState } from 'react';
import { Eye, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetComplaintsQuery, useUpdateComplaintStatusMutation } from './adminApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const STATUS_TABS = ['pending', 'reviewing', 'resolved'];
const BADGE_MAP = { pending: 'warning', reviewing: 'info', resolved: 'success' };

function ComplaintDetailModal({ complaint, isOpen, onClose, onUpdateStatus }) {
  const [note, setNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!complaint) return null;

  const order = complaint.orderId;

  const handleAction = async (status) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus({ id: complaint._id, status, note: note.trim() || undefined });
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complaint Details"
      footer={
        <div className="flex gap-2 w-full justify-end">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {complaint.status === 'pending' && (
            <Button variant="primary" loading={isUpdating} onClick={() => handleAction('reviewing')}>
              Mark as Reviewing
            </Button>
          )}
          {complaint.status === 'reviewing' && (
            <Button
              variant="success"
              loading={isUpdating}
              disabled={note.trim().length < 10}
              onClick={() => handleAction('resolved')}
            >
              Resolve
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {/* Subject + status */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-[#1C1C1C] text-base">{complaint.subject}</p>
            <p className="text-[#7E808C] text-xs mt-0.5">
              {new Date(complaint.createdAt).toLocaleString()}
            </p>
          </div>
          <Badge variant={BADGE_MAP[complaint.status] || 'neutral'}>{complaint.status}</Badge>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-3 gap-3 bg-[#F9F9F9] rounded-[6px] p-3">
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Customer</p>
            <p className="font-medium text-[#1C1C1C] text-xs">{complaint.customerId?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Restaurant</p>
            <p className="font-medium text-[#1C1C1C] text-xs">{complaint.restaurantId?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#7E808C] mb-0.5">Rider</p>
            <p className="font-medium text-[#1C1C1C] text-xs">{complaint.riderId?.name || '—'}</p>
          </div>
        </div>

        {/* Order details */}
        {order && (
          <div className="border border-[#E0E0E0] rounded-[6px] p-3">
            <p className="text-xs font-semibold text-[#7E808C] mb-2">Order Details</p>
            <div className="flex items-center justify-between">
              <p className="font-medium text-[#1C1C1C]">#{order._id?.slice(-6).toUpperCase()}</p>
              <Badge variant={order.status === 'delivered' ? 'success' : 'warning'}>{order.status}</Badge>
            </div>
            <div className="mt-2 space-y-1">
              {order.items?.map((item, i) => (
                <p key={i} className="text-xs text-[#7E808C]">
                  {item.quantity}× {item.menuItemId?.name || 'Item'}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Complaint body */}
        {complaint.description && (
          <div>
            <p className="text-xs text-[#7E808C] mb-1">Description</p>
            <p className="text-[#1C1C1C] bg-[#F9F9F9] rounded p-3 text-xs leading-relaxed">
              {complaint.description}
            </p>
          </div>
        )}

        {/* Admin note / resolution input */}
        {(complaint.status === 'reviewing' || complaint.status === 'resolved') && (
          <div>
            <label className="text-xs text-[#7E808C] block mb-1">
              Admin Note {complaint.status === 'reviewing' && <span className="text-[#E23744]">*</span>}
            </label>
            {complaint.status === 'resolved' ? (
              <p className="bg-[#F9F9F9] rounded p-3 text-xs text-[#1C1C1C]">{complaint.adminNote || '—'}</p>
            ) : (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Resolution note (min 10 chars)…"
                className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744] resize-none"
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function ComplaintManagement() {
  const [tab, setTab] = useState('pending');
  const [viewTarget, setViewTarget] = useState(null);

  const { data, isLoading } = useGetComplaintsQuery({ status: tab });
  const [updateComplaintStatus] = useUpdateComplaintStatusMutation();

  const complaints = data?.complaints || [];

  const handleUpdateStatus = async (payload) => {
    try {
      await updateComplaintStatus(payload).unwrap();
      toast.success('Complaint updated');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update complaint');
    }
  };

  return (
    <DashboardLayout title="Complaint Management">
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
      ) : complaints.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-[#7E808C] gap-2">
          <AlertCircle size={32} />
          <p className="text-sm">No {tab} complaints</p>
        </div>
      ) : (
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E0E0E0]">
              <tr>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium">Subject</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden md:table-cell">Order</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden md:table-cell">Customer</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden lg:table-cell">Restaurant</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden lg:table-cell">Date</th>
                <th className="text-right px-5 py-3 text-xs text-[#7E808C] font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {complaints.map((c) => (
                <tr key={c._id} className="hover:bg-[#F9F9F9]">
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#1C1C1C] line-clamp-1">{c.subject}</p>
                  </td>
                  <td className="px-5 py-3 text-[#7E808C] hidden md:table-cell">
                    #{c.orderId?._id?.slice(-6).toUpperCase() || '—'}
                  </td>
                  <td className="px-5 py-3 text-[#7E808C] hidden md:table-cell">{c.customerId?.name || '—'}</td>
                  <td className="px-5 py-3 text-[#7E808C] hidden lg:table-cell">{c.restaurantId?.name || '—'}</td>
                  <td className="px-5 py-3 text-[#7E808C] hidden lg:table-cell">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Badge variant={BADGE_MAP[c.status] || 'neutral'}>{c.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setViewTarget(c)}
                      className="p-1.5 rounded hover:bg-[#F1F1F6] text-[#7E808C]"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ComplaintDetailModal
        complaint={viewTarget}
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </DashboardLayout>
  );
}
