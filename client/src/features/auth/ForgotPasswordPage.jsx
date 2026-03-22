import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useForgotPasswordMutation, useResetPasswordMutation } from './authApi';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Mail, Lock, KeyRound } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

const resetSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ForgotPasswordPage() {
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [forgotPassword, { isLoading: isSending }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  const emailForm = useForm({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm({ resolver: zodResolver(resetSchema) });

  const onSendCode = async (data) => {
    try {
      await forgotPassword({ email: data.email }).unwrap();
      setEmail(data.email);
      setStep('reset');
      toast.success('Reset code sent to your email');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send reset code');
    }
  };

  const onReset = async (data) => {
    try {
      await resetPassword({ email, otp: data.otp, newPassword: data.newPassword }).unwrap();
      toast.success('Password reset successfully!');
      window.location.href = '/login';
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F1F6] flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] shadow-sm w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#E23744]">Food Lagbe</h1>
          <p className="text-sm text-[#7E808C] mt-1">
            {step === 'email' ? 'Reset your password' : `Enter the code sent to ${email}`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={emailForm.handleSubmit(onSendCode)} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={Mail}
              error={emailForm.formState.errors.email?.message}
              {...emailForm.register('email')}
            />
            <Button type="submit" loading={isSending} fullWidth>
              Send Reset Code
            </Button>
          </form>
        ) : (
          <form onSubmit={resetForm.handleSubmit(onReset)} className="flex flex-col gap-4">
            <Input
              label="OTP Code"
              placeholder="123456"
              icon={KeyRound}
              error={resetForm.formState.errors.otp?.message}
              {...resetForm.register('otp')}
            />
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              error={resetForm.formState.errors.newPassword?.message}
              {...resetForm.register('newPassword')}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              error={resetForm.formState.errors.confirmPassword?.message}
              {...resetForm.register('confirmPassword')}
            />
            <Button type="submit" loading={isResetting} fullWidth>
              Reset Password
            </Button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="text-sm text-[#7E808C] hover:text-[#1C1C1C] text-center"
            >
              Back
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[#7E808C] mt-6">
          <Link to="/login" className="text-[#E23744] hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
