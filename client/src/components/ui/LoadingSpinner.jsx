const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

export default function LoadingSpinner({ size = 'md', className = '' }) {
  return (
    <div
      className={`rounded-full border-gray-200 border-t-[#E23744] animate-spin ${sizeMap[size]} ${className}`}
    />
  );
}

export function FullscreenSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-[#7E808C] text-sm">Loading…</p>
      </div>
    </div>
  );
}
