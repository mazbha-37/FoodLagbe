import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Camera, MapPin, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { selectCurrentUser, setCredentials } from '../auth/authSlice';
import { useGetMyProfileQuery, useUpdateProfileMutation, useGetMyReviewsQuery, useGetMyComplaintsQuery, useAddAddressMutation, useDeleteAddressMutation } from './customerApi';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import StarRating from '../../components/ui/StarRating';
import { formatRelativeDate, formatDateTime } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Enter a valid BD phone number'),
});

const addressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  address: z.string().min(5, 'Address is required'),
});

const STATUS_BADGE = {
  open: 'danger', reviewing: 'warning', resolved: 'success',
};

function AddressModal({ isOpen, onClose, onSave, initial }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: initial || { label: '', address: '' },
  });

  useEffect(() => { reset(initial || { label: '', address: '' }); }, [initial, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Address' : 'Add Address'}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit(onSave)}>Save</Button>
      </>}
    >
      <div className="space-y-3">
        <Input label="Label" placeholder="Home, Work, etc." error={errors.label?.message} {...register('label')} />
        <Input label="Address" placeholder="Full delivery address" error={errors.address?.message} {...register('address')} />
      </div>
    </Modal>
  );
}

export default function ProfilePage() {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [activeTab, setActiveTab] = useState('profile');
  const [reviewPage, setReviewPage] = useState(1);
  const [complaintPage, setComplaintPage] = useState(1);
  const [addrModal, setAddrModal] = useState(false);
  const [editAddr, setEditAddr] = useState(null);

  const { data: profileData, isLoading: profileLoading } = useGetMyProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [addAddress] = useAddAddressMutation();
  const [deleteAddress] = useDeleteAddressMutation();
  const { data: reviewsData } = useGetMyReviewsQuery({ page: reviewPage, limit: 5 }, { skip: activeTab !== 'reviews' });
  const { data: complaintsData } = useGetMyComplaintsQuery({ page: complaintPage, limit: 10 }, { skip: activeTab !== 'complaints' });

  const profile = profileData?.user || currentUser;

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) reset({ name: profile.name || '', phone: profile.phone || '' });
  }, [profile]);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmitProfile = async (data) => {
    const fd = new FormData();
    fd.append('name', data.name);
    fd.append('phone', data.phone);
    if (photoFile) fd.append('profilePhoto', photoFile);
    try {
      const res = await updateProfile(fd).unwrap();
      if (res.user) dispatch(setCredentials({ user: res.user, accessToken: currentUser?.accessToken }));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update');
    }
  };

  const handleSaveAddress = async (data) => {
    try {
      await addAddress(data).unwrap();
      setAddrModal(false);
      toast.success('Address saved');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await deleteAddress(id).unwrap();
      toast.success('Address removed');
    } catch {}
  };

  const addresses = profile?.deliveryAddresses || [];

  if (profileLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-[#1C1C1C] mb-5">My Account</h1>

      {/* Tabs */}
      <div className="flex bg-white rounded-[8px] border border-[#E0E0E0] overflow-hidden mb-5">
        {[
          { key: 'profile', label: 'Profile' },
          { key: 'addresses', label: 'Addresses' },
          { key: 'reviews', label: 'Reviews' },
          { key: 'complaints', label: 'Complaints' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === t.key ? 'bg-[#E23744] text-white' : 'text-[#7E808C] hover:bg-[#F1F1F6]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6">
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[#E23744] text-white flex items-center justify-center text-3xl font-bold overflow-hidden">
                {(photoPreview || profile?.profilePhoto?.url) ? (
                  <img src={photoPreview || profile.profilePhoto.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.name?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#E23744] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#c42f3a] border-2 border-white">
                <Camera size={14} className="text-white" />
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-4">
            <Input label="Full Name" error={errors.name?.message} {...register('name')} />
            <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
            <div>
              <label className="text-sm font-medium text-[#1C1C1C] block mb-1">Email</label>
              <input
                value={profile?.email || ''}
                readOnly
                className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm text-[#7E808C] bg-[#F9F9F9] cursor-not-allowed"
              />
              <p className="text-xs text-[#7E808C] mt-1">Email cannot be changed</p>
            </div>
            <Button type="submit" loading={isUpdating} fullWidth>Save Changes</Button>
          </form>
        </div>
      )}

      {/* Addresses tab */}
      {activeTab === 'addresses' && (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr._id} className="bg-white rounded-[8px] border border-[#E0E0E0] p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-[#E23744] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#1C1C1C]">{addr.label}</p>
                  <p className="text-xs text-[#7E808C] mt-0.5">{addr.address}</p>
                </div>
              </div>
              <button onClick={() => handleDeleteAddress(addr._id)} className="text-[#7E808C] hover:text-red-500 shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {addresses.length === 0 && (
            <div className="text-center py-8 text-sm text-[#7E808C]">No saved addresses</div>
          )}
          <Button variant="outline" fullWidth onClick={() => setAddrModal(true)} className="flex items-center gap-2 justify-center">
            <Plus size={16} /> Add New Address
          </Button>
        </div>
      )}

      {/* Reviews tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {reviewsData?.reviews?.map((r) => (
            <div key={r._id} className="bg-white rounded-[8px] border border-[#E0E0E0] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#1C1C1C]">{r.restaurantId?.name || 'Restaurant'}</p>
                <StarRating rating={r.rating} size={14} />
              </div>
              <p className="text-sm text-[#7E808C]">{r.comment}</p>
              <p className="text-xs text-[#7E808C] mt-2">{formatRelativeDate(r.createdAt)}</p>
            </div>
          ))}
          {(!reviewsData?.reviews || reviewsData.reviews.length === 0) && (
            <div className="text-center py-12 text-sm text-[#7E808C]">No reviews yet</div>
          )}
          <Pagination
            page={reviewPage}
            totalPages={reviewsData?.pages || 1}
            total={reviewsData?.total || 0}
            limit={5}
            onPageChange={setReviewPage}
          />
        </div>
      )}

      {/* Complaints tab */}
      {activeTab === 'complaints' && (
        <div className="space-y-3">
          {complaintsData?.complaints?.map((c) => (
            <div key={c._id} className="bg-white rounded-[8px] border border-[#E0E0E0] p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1C1C1C]">{c.subject}</p>
                  <p className="text-xs text-[#7E808C] mt-1 line-clamp-2">{c.description}</p>
                </div>
                <Badge variant={STATUS_BADGE[c.status] || 'neutral'} className="ml-2 shrink-0">
                  {c.status}
                </Badge>
              </div>
              {c.adminNote && (
                <div className="mt-2 p-2 bg-[#F1F1F6] rounded text-xs text-[#7E808C]">
                  <span className="font-medium">Admin note: </span>{c.adminNote}
                </div>
              )}
              <p className="text-xs text-[#7E808C] mt-2">{formatDateTime(c.createdAt)}</p>
            </div>
          ))}
          {(!complaintsData?.complaints || complaintsData.complaints.length === 0) && (
            <div className="text-center py-12 text-sm text-[#7E808C]">No complaints filed</div>
          )}
          <Pagination
            page={complaintPage}
            totalPages={complaintsData?.pages || 1}
            total={complaintsData?.total || 0}
            limit={10}
            onPageChange={setComplaintPage}
          />
        </div>
      )}

      <AddressModal
        isOpen={addrModal}
        onClose={() => setAddrModal(false)}
        onSave={handleSaveAddress}
      />
    </div>
  );
}
