import { useState } from 'react';
import { User, Pause, Play, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetUsersQuery, useSuspendUserMutation, useUnsuspendUserMutation } from './adminApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';

const ROLE_TABS = [
  { value: 'customer', label: 'Customers' },
  { value: 'restaurant_owner', label: 'Restaurant Owners' },
  { value: 'rider', label: 'Riders' },
];

function SuspendModal({ isOpen, onClose, onConfirm, loading, user }) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Suspend ${user?.name || 'User'}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={() => onConfirm(reason)}>
            Suspend
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#7E808C] mb-3">
        This will prevent the user from accessing the platform. Provide a reason:
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Reason for suspension…"
        className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744] resize-none"
      />
    </Modal>
  );
}

export default function UserManagement() {
  const [role, setRole] = useState('customer');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [suspendTarget, setSuspendTarget] = useState(null);

  const { data, isLoading } = useGetUsersQuery({ role, page, limit: 15, search });
  const [suspendUser, { isLoading: isSuspending }] = useSuspendUserMutation();
  const [unsuspendUser] = useUnsuspendUserMutation();

  const users = data?.users || [];

  const handleSuspend = async (reason) => {
    try {
      await suspendUser({ id: suspendTarget._id, reason }).unwrap();
      toast.success('User suspended');
      setSuspendTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to suspend user');
    }
  };

  const handleUnsuspend = async (id) => {
    try {
      await unsuspendUser(id).unwrap();
      toast.success('User unsuspended');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to unsuspend user');
    }
  };

  return (
    <DashboardLayout title="User Management">
      {/* Role tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden">
          {ROLE_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setRole(value); setPage(1); }}
              className={`px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                role === value ? 'bg-[#E23744] text-white' : 'text-[#7E808C] hover:bg-[#F1F1F6]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7E808C]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email…"
            className="pl-9 pr-3 py-2 border border-[#E0E0E0] rounded-[6px] text-sm focus:outline-none focus:border-[#E23744] w-full sm:w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-sm text-[#7E808C]">No users found</div>
      ) : (
        <>
          <div className="bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E0E0E0]">
                <tr>
                  <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium">User</th>
                  <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden md:table-cell">Phone</th>
                  <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden lg:table-cell">Joined</th>
                  <th className="text-right px-5 py-3 text-xs text-[#7E808C] font-medium">Status</th>
                  <th className="text-right px-5 py-3 text-xs text-[#7E808C] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0]">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-[#F9F9F9]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E237441A] flex items-center justify-center shrink-0">
                          <User size={14} className="text-[#E23744]" />
                        </div>
                        <div>
                          <p className="font-medium text-[#1C1C1C]">{u.name}</p>
                          <p className="text-xs text-[#7E808C]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#7E808C] hidden md:table-cell">{u.phone || '—'}</td>
                    <td className="px-5 py-3 text-[#7E808C] hidden lg:table-cell">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge variant={u.isSuspended ? 'danger' : 'success'}>
                        {u.isSuspended ? 'Suspended' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {u.isSuspended ? (
                        <button
                          onClick={() => handleUnsuspend(u._id)}
                          className="p-1.5 rounded hover:bg-[#60B24620] text-[#60B246]"
                          title="Unsuspend"
                        >
                          <Play size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setSuspendTarget(u)}
                          className="p-1.5 rounded hover:bg-[#E2374420] text-[#E23744]"
                          title="Suspend"
                        >
                          <Pause size={15} />
                        </button>
                      )}
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

      <SuspendModal
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspend}
        loading={isSuspending}
        user={suspendTarget}
      />
    </DashboardLayout>
  );
}
