import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useGetMyRestaurantQuery, useSubmitApplicationMutation } from './restaurantApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import LocationPicker from '../../components/map/LocationPicker';

const CUISINE_TYPES = [
  'Bangladeshi', 'Indian', 'Chinese', 'Thai', 'Italian', 'American',
  'Fast Food', 'Burgers', 'Pizza', 'Biryani', 'Seafood', 'Desserts',
  'Beverages', 'Healthy', 'Vegetarian', 'Bakery',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const schema = z.object({
  name: z.string().min(2, 'Restaurant name required'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Enter a valid BD phone number'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  cuisineTypes: z.array(z.string()).min(1, 'Select at least one cuisine type'),
  estimatedPrepTime: z.coerce.number().min(5, 'At least 5 minutes').max(120),
  openingHours: z.array(z.object({
    isOpen: z.boolean(),
    open: z.string(),
    close: z.string(),
  })),
});

export default function ApplicationForm() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetMyRestaurantQuery();
  const [submitApplication, { isLoading: isSubmitting }] = useSubmitApplicationMutation();

  const restaurant = data?.restaurant;
  const status = restaurant?.applicationStatus;

  const [coverPhoto, setCoverPhoto] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [tradeLicense, setTradeLicense] = useState(null);
  const [tradePreview, setTradePreview] = useState(null);
  const [location, setLocation] = useState(null);

  const defaultHours = DAYS.map(() => ({ isOpen: true, open: '09:00', close: '22:00' }));

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      phone: '',
      address: '',
      cuisineTypes: [],
      estimatedPrepTime: 30,
      openingHours: defaultHours,
    },
  });

  const cuisineTypes = watch('cuisineTypes');
  const openingHours = watch('openingHours');

  const toggleCuisine = (type) => {
    const current = cuisineTypes || [];
    if (current.includes(type)) {
      setValue('cuisineTypes', current.filter((t) => t !== type));
    } else {
      setValue('cuisineTypes', [...current, type]);
    }
  };

  const onSubmit = async (data) => {
    if (!location) { toast.error('Please select a location on the map'); return; }
    if (!coverPhoto) { toast.error('Cover photo is required'); return; }
    if (!tradeLicense) { toast.error('Trade license photo is required'); return; }

    const fd = new FormData();
    fd.append('restaurantName', data.name);
    fd.append('description', data.description);
    fd.append('phone', data.phone);
    fd.append('address', data.address);
    fd.append('latitude', location.latitude);
    fd.append('longitude', location.longitude);
    fd.append('estimatedPrepTime', data.estimatedPrepTime);
    fd.append('cuisineTypes', JSON.stringify(data.cuisineTypes));
    fd.append('openingHours', JSON.stringify(data.openingHours.map((h, i) => ({
      day: i,
      isOpen: h.isOpen,
      openTime: h.open,
      closeTime: h.close,
    }))));
    fd.append('coverPhoto', coverPhoto);
    fd.append('tradeLicensePhoto', tradeLicense);

    try {
      await submitApplication(fd).unwrap();
      toast.success('Application submitted!');
      navigate('/restaurant/dashboard');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to submit application');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Restaurant Application">
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  // Pending state
  if (status === 'pending') {
    return (
      <DashboardLayout title="Restaurant Application">
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <Clock size={36} className="text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold text-[#1C1C1C] mb-2">Application Under Review</h2>
          <p className="text-[#7E808C] text-sm">
            Your restaurant application has been submitted and is currently being reviewed by our team.
            We'll notify you once a decision has been made.
          </p>
          <p className="text-xs text-[#7E808C] mt-4">Typical review time: 1–2 business days</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Restaurant Application">
      <div className="max-w-2xl mx-auto">
        {/* Rejection alert */}
        {status === 'rejected' && restaurant?.rejectionReason && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[8px] flex gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Application Rejected</p>
              <p className="text-sm text-red-600 mt-1">{restaurant.rejectionReason}</p>
              <p className="text-xs text-red-500 mt-2">Please address the issue and resubmit your application.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6 space-y-4">
            <h3 className="font-semibold text-[#1C1C1C]">Basic Information</h3>
            <Input label="Restaurant Name" error={errors.name?.message} {...register('name')} />
            <div>
              <label className="text-sm font-medium text-[#1C1C1C] block mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Describe your restaurant, specialties, atmosphere..."
                className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744] resize-none"
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>
            <Input label="Phone Number" placeholder="01XXXXXXXXX" error={errors.phone?.message} {...register('phone')} />
            <Input label="Address" placeholder="Full restaurant address" error={errors.address?.message} {...register('address')} />
            <div>
              <label className="text-sm font-medium text-[#1C1C1C] block mb-1">
                Estimated Prep Time <span className="text-[#7E808C] font-normal">(minutes)</span>
              </label>
              <input
                type="number"
                min={5}
                max={120}
                {...register('estimatedPrepTime')}
                className="w-32 border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744]"
              />
              {errors.estimatedPrepTime && <p className="text-xs text-red-500 mt-1">{errors.estimatedPrepTime.message}</p>}
            </div>
          </div>

          {/* Cuisine Types */}
          <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6">
            <h3 className="font-semibold text-[#1C1C1C] mb-3">Cuisine Types</h3>
            <div className="flex flex-wrap gap-2">
              {CUISINE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleCuisine(type)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    cuisineTypes?.includes(type)
                      ? 'bg-[#E23744] text-white border-[#E23744]'
                      : 'border-[#E0E0E0] text-[#7E808C] hover:border-[#E23744]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {errors.cuisineTypes && <p className="text-xs text-red-500 mt-2">{errors.cuisineTypes.message}</p>}
          </div>

          {/* Opening Hours */}
          <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6">
            <h3 className="font-semibold text-[#1C1C1C] mb-4">Opening Hours</h3>
            <div className="space-y-3">
              {DAYS.map((day, i) => (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register(`openingHours.${i}.isOpen`)}
                        className="accent-[#E23744]"
                      />
                      <span className="text-sm text-[#1C1C1C]">{day.slice(0, 3)}</span>
                    </label>
                  </div>
                  {openingHours?.[i]?.isOpen ? (
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        {...register(`openingHours.${i}.open`)}
                        className="border border-[#E0E0E0] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#E23744]"
                      />
                      <span className="text-[#7E808C]">to</span>
                      <input
                        type="time"
                        {...register(`openingHours.${i}.close`)}
                        className="border border-[#E0E0E0] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#E23744]"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-[#7E808C]">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6">
            <h3 className="font-semibold text-[#1C1C1C] mb-3">Restaurant Location</h3>
            <p className="text-xs text-[#7E808C] mb-3">Click on the map or search to set your restaurant's exact location.</p>
            <LocationPicker onLocationSelect={setLocation} />
            {!location && <p className="text-xs text-red-500 mt-2">Location is required</p>}
          </div>

          {/* Photos */}
          <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6 space-y-4">
            <h3 className="font-semibold text-[#1C1C1C]">Photos</h3>

            {/* Cover Photo */}
            <div>
              <label className="text-sm font-medium text-[#1C1C1C] block mb-2">Cover Photo *</label>
              <div className="flex items-start gap-4">
                {coverPreview && (
                  <img src={coverPreview} alt="" className="w-24 h-16 object-cover rounded border border-[#E0E0E0]" />
                )}
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-[#E0E0E0] rounded-[8px] px-4 py-3 text-sm text-[#7E808C] hover:border-[#E23744] transition-colors">
                    {coverPhoto ? coverPhoto.name : 'Click to upload cover photo'}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setCoverPhoto(f); setCoverPreview(URL.createObjectURL(f)); }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Trade License */}
            <div>
              <label className="text-sm font-medium text-[#1C1C1C] block mb-2">Trade License *</label>
              <div className="flex items-start gap-4">
                {tradePreview && (
                  <img src={tradePreview} alt="" className="w-24 h-16 object-cover rounded border border-[#E0E0E0]" />
                )}
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-[#E0E0E0] rounded-[8px] px-4 py-3 text-sm text-[#7E808C] hover:border-[#E23744] transition-colors">
                    {tradeLicense ? tradeLicense.name : 'Click to upload trade license photo'}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setTradeLicense(f); setTradePreview(URL.createObjectURL(f)); }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <Button type="submit" loading={isSubmitting} fullWidth size="lg">
            Submit Application
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
