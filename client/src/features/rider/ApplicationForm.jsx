import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Clock, AlertCircle, Upload, CheckCircle } from 'lucide-react';
import { useGetMyRiderQuery, useSubmitRiderApplicationMutation } from './riderApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const VEHICLE_TYPES = ['bicycle', 'motorcycle', 'car'];

const schema = z.object({
  nidNumber: z.string().regex(/^\d{10,17}$/, 'NID number must be 10 to 17 digits'),
  vehicleType: z.enum(['bicycle', 'motorcycle', 'car'], { required_error: 'Select a vehicle type' }),
  vehicleRegNumber: z.string().min(5, 'At least 5 characters').max(20).optional().or(z.literal('')),
});

function PhotoUploadBox({ label, file, onChange, accept = 'image/*', required }) {
  return (
    <div>
      <label className="text-sm font-medium text-[#1C1C1C] block mb-1">
        {label} {required && <span className="text-[#E23744]">*</span>}
      </label>
      <label className="cursor-pointer block">
        <div className={`border-2 border-dashed rounded-[8px] px-4 py-6 flex flex-col items-center gap-2 transition-colors ${
          file ? 'border-[#60B246] bg-[#60B24610]' : 'border-[#E0E0E0] hover:border-[#E23744]'
        }`}>
          {file ? (
            <>
              <CheckCircle size={24} className="text-[#60B246]" />
              <span className="text-sm text-[#1C1C1C] font-medium">{file.name}</span>
              <span className="text-xs text-[#7E808C]">Click to change</span>
            </>
          ) : (
            <>
              <Upload size={24} className="text-[#7E808C]" />
              <span className="text-sm text-[#7E808C]">Click to upload</span>
            </>
          )}
        </div>
        <input type="file" accept={accept} className="hidden" onChange={onChange} />
      </label>
    </div>
  );
}

export default function RiderApplicationForm() {
  const { data, isLoading } = useGetMyRiderQuery();
  const [submitApplication, { isLoading: isSubmitting }] = useSubmitRiderApplicationMutation();

  const [nidPhoto, setNidPhoto] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [vehicleRegPhoto, setVehicleRegPhoto] = useState(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { vehicleType: '' },
  });

  const vehicleType = watch('vehicleType');
  const needsVehicleReg = vehicleType === 'motorcycle' || vehicleType === 'car';

  const rider = data?.rider;
  const status = rider?.applicationStatus;

  const onSubmit = async (formData) => {
    if (!nidPhoto) return toast.error('NID photo is required');
    if (!profilePhoto) return toast.error('Profile photo is required');
    if (needsVehicleReg && !vehicleRegPhoto) return toast.error('Vehicle registration photo is required');

    const fd = new FormData();
    fd.append('nidNumber', formData.nidNumber);
    fd.append('vehicleType', formData.vehicleType);
    if (needsVehicleReg && formData.vehicleRegNumber) {
      fd.append('vehicleRegNumber', formData.vehicleRegNumber);
    }
    fd.append('nidPhoto', nidPhoto);
    fd.append('profilePhoto', profilePhoto);
    if (vehicleRegPhoto) fd.append('vehicleRegPhoto', vehicleRegPhoto);

    try {
      await submitApplication(fd).unwrap();
      toast.success('Application submitted successfully!');
    } catch (err) {
      const detail = err?.data?.details?.[0]?.message;
      toast.error(detail || err?.data?.message || 'Failed to submit application');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Rider Application">
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </DashboardLayout>
    );
  }

  if (status === 'pending') {
    return (
      <DashboardLayout title="Rider Application">
        <div className="max-w-md mx-auto mt-12 text-center">
          <div className="w-20 h-20 rounded-full bg-[#FFF3CD] flex items-center justify-center mx-auto mb-4">
            <Clock size={40} className="text-[#FC8019]" />
          </div>
          <h2 className="text-xl font-semibold text-[#1C1C1C] mb-2">Application Under Review</h2>
          <p className="text-sm text-[#7E808C]">
            Your rider application has been submitted and is currently under review. We'll notify you once a decision has been made.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (status === 'rejected') {
    return (
      <DashboardLayout title="Rider Application">
        <div className="max-w-lg mx-auto mt-8">
          <div className="bg-[#FFF0F1] border border-[#E23744] rounded-[8px] p-4 flex gap-3 mb-6">
            <AlertCircle size={20} className="text-[#E23744] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#E23744] text-sm">Application Rejected</p>
              {rider.rejectionReason && (
                <p className="text-sm text-[#1C1C1C] mt-1">{rider.rejectionReason}</p>
              )}
              <p className="text-xs text-[#7E808C] mt-2">You may resubmit your application below.</p>
            </div>
          </div>
          <ApplicationFormBody
            register={register}
            handleSubmit={handleSubmit}
            onSubmit={onSubmit}
            errors={errors}
            vehicleType={vehicleType}
            needsVehicleReg={needsVehicleReg}
            nidPhoto={nidPhoto}
            setNidPhoto={setNidPhoto}
            profilePhoto={profilePhoto}
            setProfilePhoto={setProfilePhoto}
            vehicleRegPhoto={vehicleRegPhoto}
            setVehicleRegPhoto={setVehicleRegPhoto}
            isSubmitting={isSubmitting}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Rider Application">
      <div className="max-w-lg">
        <p className="text-sm text-[#7E808C] mb-6">
          Fill out the form below to apply as a Food Lagbe delivery rider.
        </p>
        <ApplicationFormBody
          register={register}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          errors={errors}
          vehicleType={vehicleType}
          needsVehicleReg={needsVehicleReg}
          nidPhoto={nidPhoto}
          setNidPhoto={setNidPhoto}
          profilePhoto={profilePhoto}
          setProfilePhoto={setProfilePhoto}
          vehicleRegPhoto={vehicleRegPhoto}
          setVehicleRegPhoto={setVehicleRegPhoto}
          isSubmitting={isSubmitting}
        />
      </div>
    </DashboardLayout>
  );
}

function ApplicationFormBody({
  register, handleSubmit, onSubmit, errors,
  vehicleType, needsVehicleReg,
  nidPhoto, setNidPhoto, profilePhoto, setProfilePhoto,
  vehicleRegPhoto, setVehicleRegPhoto, isSubmitting,
}) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Personal Info */}
      <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-5 space-y-4">
        <h3 className="font-semibold text-[#1C1C1C]">Personal Information</h3>
        <Input
          label="NID Number"
          placeholder="Your National ID number"
          error={errors.nidNumber?.message}
          {...register('nidNumber')}
        />
        <PhotoUploadBox
          label="NID Photo"
          file={nidPhoto}
          onChange={(e) => setNidPhoto(e.target.files?.[0] || null)}
          required
        />
        <PhotoUploadBox
          label="Profile Photo"
          file={profilePhoto}
          onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
          required
        />
      </div>

      {/* Vehicle Info */}
      <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-5 space-y-4">
        <h3 className="font-semibold text-[#1C1C1C]">Vehicle Information</h3>
        <div>
          <label className="text-sm font-medium text-[#1C1C1C] block mb-2">
            Vehicle Type <span className="text-[#E23744]">*</span>
          </label>
          <div className="flex gap-3">
            {VEHICLE_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={type}
                  {...register('vehicleType')}
                  className="accent-[#E23744]"
                />
                <span className="text-sm capitalize text-[#1C1C1C]">{type}</span>
              </label>
            ))}
          </div>
          {errors.vehicleType && (
            <p className="text-xs text-red-500 mt-1">{errors.vehicleType.message}</p>
          )}
        </div>

        {needsVehicleReg && (
          <>
            <Input
              label="Vehicle Registration Number"
              placeholder="e.g. DHAKA-MET-A-23-3456"
              {...register('vehicleRegNumber')}
            />
            <PhotoUploadBox
              label="Vehicle Registration Photo"
              file={vehicleRegPhoto}
              onChange={(e) => setVehicleRegPhoto(e.target.files?.[0] || null)}
              required
            />
          </>
        )}
      </div>

      <Button type="submit" loading={isSubmitting} fullWidth size="lg">
        Submit Application
      </Button>
    </form>
  );
}
