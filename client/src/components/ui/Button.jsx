import LoadingSpinner from './LoadingSpinner';

const variants = {
  primary: 'bg-[#E23744] hover:bg-[#c42f3a] text-white',
  secondary: 'bg-[#FC8019] hover:bg-[#e0711a] text-white',
  outline: 'border border-[#E23744] text-[#E23744] hover:bg-[#fff0f1] bg-transparent',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'text-[#7E808C] hover:bg-gray-100 bg-transparent',
  success: 'bg-[#60B246] hover:bg-[#52993c] text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium rounded-[6px] transition-colors duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}
