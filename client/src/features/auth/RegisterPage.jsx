import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useRegisterMutation } from './authApi';
import { setCredentials, selectIsAuthenticated } from './authSlice';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Mail, Lock, User, Phone, UtensilsCrossed, Truck, ShoppingBag } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Enter a valid BD phone number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[!@#$%^&*]/, 'Must contain a special character (!@#$%^&*)'),
  confirmPassword: z.string(),
  role: z.enum(['customer', 'restaurant_owner', 'rider']),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const ROLES = [
  { value: 'customer', label: 'Customer', icon: ShoppingBag },
  { value: 'restaurant_owner', label: 'Restaurant Owner', icon: UtensilsCrossed },
  { value: 'rider', label: 'Delivery Rider', icon: Truck },
];

const ROLE_HOME = {
  customer: '/',
  restaurant_owner: '/restaurant/dashboard',
  rider: '/rider/dashboard',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [register, { isLoading }] = useRegisterMutation();
  const [selectedRole, setSelectedRole] = useState('customer');

  const { register: formReg, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'customer' },
  });

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const selectRole = (role) => {
    setSelectedRole(role);
    setValue('role', role);
  };

  const onSubmit = async (data) => {
    const { confirmPassword, ...payload } = data;
    try {
      const result = await register(payload).unwrap();
      dispatch(setCredentials({ user: result.user, accessToken: result.accessToken }));
      toast.success('Account created!');
      navigate(ROLE_HOME[result.user.role] || '/');
    } catch (err) {
      toast.error(err?.data?.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F1F6] flex items-center justify-center p-4">
      <div className="bg-white rounded-[8px] shadow-sm w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#E23744]">Food Lagbe</h1>
          <p className="text-sm text-[#7E808C] mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Role selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1C1C1C]">I want to…</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectRole(value)}
                  className={[
                    'flex flex-col items-center gap-1.5 p-3 rounded-[8px] border-2 text-center transition-colors',
                    selectedRole === value
                      ? 'border-[#E23744] bg-[#fff0f1]'
                      : 'border-[#E0E0E0] hover:border-[#E23744]/40',
                  ].join(' ')}
                >
                  <Icon size={20} className={selectedRole === value ? 'text-[#E23744]' : 'text-[#7E808C]'} />
                  <span className={`text-xs font-medium ${selectedRole === value ? 'text-[#E23744]' : 'text-[#1C1C1C]'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
            {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
          </div>

          <Input label="Full Name" placeholder="Rahim Uddin" icon={User} error={errors.name?.message} {...formReg('name')} />
          <Input label="Email" type="email" placeholder="you@example.com" icon={Mail} error={errors.email?.message} {...formReg('email')} />
          <Input label="Phone" placeholder="01XXXXXXXXX" icon={Phone} error={errors.phone?.message} {...formReg('phone')} />
          <Input label="Password" type="password" placeholder="••••••••" icon={Lock} error={errors.password?.message} {...formReg('password')} />
          <Input label="Confirm Password" type="password" placeholder="••••••••" icon={Lock} error={errors.confirmPassword?.message} {...formReg('confirmPassword')} />

          <Button type="submit" loading={isLoading} fullWidth className="mt-2">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-[#7E808C] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[#E23744] font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
