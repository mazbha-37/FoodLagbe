import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useLoginMutation } from './authApi';
import { setCredentials, selectIsAuthenticated } from './authSlice';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Mail, Lock } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const ROLE_HOME = {
  customer: '/',
  restaurant_owner: '/restaurant/dashboard',
  rider: '/rider/dashboard',
  admin: '/admin/dashboard',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [login, { isLoading }] = useLoginMutation();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data) => {
    try {
      const result = await login(data).unwrap();
      dispatch(setCredentials({ user: result.user, accessToken: result.accessToken }));
      navigate(ROLE_HOME[result.user.role] || '/');
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F1F6] flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] shadow-sm w-full max-w-sm p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#E23744]">Food Lagbe</h1>
          <p className="text-sm text-[#7E808C] mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-[#E23744] hover:underline">
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" loading={isLoading} fullWidth>
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-[#7E808C] mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#E23744] font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
