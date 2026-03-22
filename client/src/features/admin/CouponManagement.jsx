import { useState } from 'react';
import { Plus, Edit, Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeactivateCouponMutation,
} from './adminApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../utils/formatCurrency';

const couponSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 chars').toUpperCase(),
  discountType: z.enum(['percentage', 'flat']),
  discountValue: z.coerce.number().positive('Must be positive'),
  minOrderAmount: z.coerce.number().min(0),
  maxDiscount: z.coerce.number().optional(),
  usageLimit: z.coerce.number().int().positive(),
  perUserLimit: z.coerce.number().int().min(1),
  validFrom: z.string().min(1, 'Required'),
  validUntil: z.string().min(1, 'Required'),
});

function CouponModal({ isOpen, onClose, onSubmit, loading, defaultValues }) {
  const isEdit = !!defaultValues;
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(couponSchema),
    defaultValues: defaultValues || {
      discountType: 'percentage',
      minOrderAmount: 0,
      usageLimit: 100,
      perUserLimit: 1,
    },
  });
  const discountType = watch('discountType');

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Coupon' : 'Create Coupon'}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit(onSubmit)}>
            {isEdit ? 'Save Changes' : 'Create Coupon'}
          </Button>
        </>
      }
    >
      <form className="space-y-4 text-sm">
        <Input label="Coupon Code" error={errors.code?.message} {...register('code')} />

        <div>
          <label className="text-sm font-medium text-[#1C1C1C] block mb-2">Discount Type</label>
          <div className="flex gap-6">
            {['percentage', 'flat'].map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={type} {...register('discountType')} className="accent-[#E23744]" />
                <span className="capitalize">{type} {type === 'percentage' ? '(%)' : '(৳)'}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={`Discount Value ${discountType === 'percentage' ? '(%)' : '(৳)'}`}
            type="number"
            min="0"
            error={errors.discountValue?.message}
            {...register('discountValue')}
          />
          {discountType === 'percentage' && (
            <Input
              label="Max Discount (৳)"
              type="number"
              min="0"
              placeholder="Optional cap"
              {...register('maxDiscount')}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Min Order Amount (৳)"
            type="number"
            min="0"
            error={errors.minOrderAmount?.message}
            {...register('minOrderAmount')}
          />
          <Input
            label="Usage Limit"
            type="number"
            min="1"
            error={errors.usageLimit?.message}
            {...register('usageLimit')}
          />
        </div>

        <Input
          label="Per User Limit"
          type="number"
          min="1"
          error={errors.perUserLimit?.message}
          {...register('perUserLimit')}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-[#1C1C1C] block mb-1">Valid From</label>
            <input
              type="date"
              {...register('validFrom')}
              className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744]"
            />
            {errors.validFrom && <p className="text-xs text-red-500 mt-1">{errors.validFrom.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-[#1C1C1C] block mb-1">Valid Until</label>
            <input
              type="date"
              {...register('validUntil')}
              className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744]"
            />
            {errors.validUntil && <p className="text-xs text-red-500 mt-1">{errors.validUntil.message}</p>}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function DeactivateModal({ coupon, isOpen, onClose, onConfirm, loading }) {
  if (!coupon) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deactivate Coupon"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>Deactivate</Button>
        </>
      }
    >
      <p className="text-sm text-[#7E808C]">
        Are you sure you want to deactivate coupon <span className="font-semibold text-[#1C1C1C]">{coupon.code}</span>?
        Users will no longer be able to use it.
      </p>
    </Modal>
  );
}

export default function CouponManagement() {
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const { data, isLoading } = useGetCouponsQuery();
  const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: isUpdating }] = useUpdateCouponMutation();
  const [deactivateCoupon, { isLoading: isDeactivating }] = useDeactivateCouponMutation();

  const coupons = data?.coupons || [];

  const handleCreate = async (formData) => {
    try {
      await createCoupon(formData).unwrap();
      toast.success('Coupon created');
      setShowCreate(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create coupon');
    }
  };

  const handleUpdate = async (formData) => {
    try {
      await updateCoupon({ id: editTarget._id, ...formData }).unwrap();
      toast.success('Coupon updated');
      setEditTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update coupon');
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateCoupon(deactivateTarget._id).unwrap();
      toast.success('Coupon deactivated');
      setDeactivateTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to deactivate');
    }
  };

  return (
    <DashboardLayout title="Coupon Management">
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-[#7E808C]">{coupons.length} coupons</p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Create Coupon
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-20 text-sm text-[#7E808C]">No coupons yet</div>
      ) : (
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E0E0E0]">
              <tr>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium">Code</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium">Discount</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden md:table-cell">Min Order</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden lg:table-cell">Usage</th>
                <th className="text-left px-5 py-3 text-xs text-[#7E808C] font-medium hidden lg:table-cell">Valid Until</th>
                <th className="text-right px-5 py-3 text-xs text-[#7E808C] font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {coupons.map((c) => (
                <tr key={c._id} className="hover:bg-[#F9F9F9]">
                  <td className="px-5 py-3 font-mono font-semibold text-[#1C1C1C]">{c.code}</td>
                  <td className="px-5 py-3 text-[#1C1C1C]">
                    {c.discountType === 'percentage'
                      ? `${c.discountValue}%${c.maxDiscount ? ` (max ${formatCurrency(c.maxDiscount)})` : ''}`
                      : formatCurrency(c.discountValue)}
                  </td>
                  <td className="px-5 py-3 text-[#7E808C] hidden md:table-cell">
                    {formatCurrency(c.minOrderAmount || 0)}
                  </td>
                  <td className="px-5 py-3 text-[#7E808C] hidden lg:table-cell">
                    {c.usedCount ?? 0}/{c.usageLimit}
                  </td>
                  <td className="px-5 py-3 text-[#7E808C] hidden lg:table-cell">
                    {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Badge variant={c.isActive ? 'success' : 'neutral'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditTarget(c)}
                        className="p-1.5 rounded hover:bg-[#F1F1F6] text-[#7E808C]"
                        title="Edit"
                      >
                        <Edit size={15} />
                      </button>
                      {c.isActive && (
                        <button
                          onClick={() => setDeactivateTarget(c)}
                          className="p-1.5 rounded hover:bg-[#E2374420] text-[#E23744]"
                          title="Deactivate"
                        >
                          <Pause size={15} />
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

      <CouponModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        loading={isCreating}
      />

      {editTarget && (
        <CouponModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          loading={isUpdating}
          defaultValues={{
            code: editTarget.code,
            discountType: editTarget.discountType,
            discountValue: editTarget.discountValue,
            minOrderAmount: editTarget.minOrderAmount || 0,
            maxDiscount: editTarget.maxDiscount,
            usageLimit: editTarget.usageLimit,
            perUserLimit: editTarget.perUserLimit || 1,
            validFrom: editTarget.validFrom?.split('T')[0] || '',
            validUntil: editTarget.validUntil?.split('T')[0] || '',
          }}
        />
      )}

      <DeactivateModal
        coupon={deactivateTarget}
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        loading={isDeactivating}
      />
    </DashboardLayout>
  );
}
