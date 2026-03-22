import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useGetMyRestaurantQuery, useUpdateRestaurantMutation } from './restaurantApi';
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
  description: z.string().min(10, 'Description must be at least 10 characters'),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Enter a valid BD phone number'),
  address: z.string().min(5, 'Address required'),
  cuisineTypes: z.array(z.string()).min(1, 'Select at least one cuisine type'),
  estimatedPrepTime: z.coerce.number().min(5).max(120),
  openingHours: z.array(z.object({
    isOpen: z.boolean(),
    open: z.string(),
    close: z.string(),
  })),
});

export default function RestaurantSettings() {
  const { data, isLoading } = useGetMyRestaurantQuery();
  const [updateRestaurant, { isLoading: isSaving }] = useUpdateRestaurantMutation();

  const restaurant = data?.restaurant;

  const [coverPhoto, setCoverPhoto] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [location, setLocation] = useState(null);

  const defaultHours = DAYS.map(() => ({ isOpen: true, open: '09:00', close: '22:00' }));

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
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

  // Pre-fill form when restaurant loads
  useEffect(() => {
    if (!restaurant) return;
    const hours = DAYS.map((day, i) => {
      const existing = restaurant.openingHours?.find((h) => h.day === i);
      return {
        isOpen: existing?.isOpen ?? true,
        open: existing?.openTime || '09:00',
        close: existing?.closeTime || '22:00',
      };
    });
    reset({
      name: restaurant.name || '',
      description: restaurant.description || '',
      phone: restaurant.phone || '',
      address: restaurant.address || '',
      cuisineTypes: restaurant.cuisineTypes || [],
      estimatedPrepTime: restaurant.estimatedPrepTime || 30,
      openingHours: hours,
    });
    if (restaurant.location?.coordinates) {
      setLocation({
        latitude: restaurant.location.coordinates[1],
        longitude: restaurant.location.coordinates[0],
        address: restaurant.address,
      });
    }
    setCoverPreview(restaurant.coverPhoto?.url || null);
  }, [restaurant]);

  const toggleCuisine = (type) => {
    const current = cuisineTypes || [];
    setValue(
      'cuisineTypes',
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  };

  const onSubmit = async (data) => {
    const fd = new FormData();
    fd.append('restaurantName', data.name);
    fd.append('description', data.description);
    fd.append('phone', data.phone);
    fd.append('address', data.address);
    if (location) {
      fd.append('latitude', location.latitude);
      fd.append('longitude', location.longitude);
    }
    fd.append('estimatedPrepTime', data.estimatedPrepTime);
    fd.append('cuisineTypes', JSON.stringify(data.cuisineTypes));
    fd.append('openingHours', JSON.stringify(data.openingHours.map((h, i) => ({
      day: i,
      isOpen: h.isOpen,
      openTime: h.open,
      closeTime: h.close,
    }))));
    if (coverPhoto) fd.append('coverPhoto', coverPhoto);

    try {
      await updateRestaurant({ id: restaurant._id, formData: fd }).unwrap();
      toast.success('Settings saved!');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Restaurant Settings">
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Restaurant Settings">
      <div className="max-w-2xl">
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
                className="w-full border border-[#E0E0E0] rounded-[6px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#E23744] resize-none"
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>
            <Input label="Phone Number" error={errors.phone?.message} {...register('phone')} />
            <Input label="Address" error={errors.address?.message} {...register('address')} />
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
            <LocationPicker
              onLocationSelect={setLocation}
              initialLocation={location}
            />
          </div>

          {/* Cover Photo */}
          <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-6">
            <h3 className="font-semibold text-[#1C1C1C] mb-3">Cover Photo</h3>
            <div className="flex items-start gap-4">
              {coverPreview && (
                <img src={coverPreview} alt="" className="w-32 h-20 object-cover rounded border border-[#E0E0E0]" />
              )}
              <label className="cursor-pointer mt-1">
                <div className="border-2 border-dashed border-[#E0E0E0] rounded-[8px] px-4 py-3 text-sm text-[#7E808C] hover:border-[#E23744] transition-colors">
                  {coverPhoto ? coverPhoto.name : 'Click to change cover photo'}
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

          <Button type="submit" loading={isSaving} fullWidth size="lg">
            Save Settings
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
