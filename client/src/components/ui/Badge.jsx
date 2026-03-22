const variants = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-600',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-[#7E808C]',
  primary: 'bg-[#fff0f1] text-[#E23744]',
  secondary: 'bg-orange-50 text-[#FC8019]',
};

const sizes = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
};

export default function Badge({ children, variant = 'neutral', size = 'sm', className = '' }) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
