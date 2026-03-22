import { Star } from 'lucide-react';

export default function StarRating({ rating = 0, max = 5, size = 16, interactive = false, onChange }) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  if (interactive) {
    return (
      <div className="flex gap-0.5">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className="text-gray-300 hover:text-yellow-400 transition-colors"
          >
            <Star
              size={size}
              className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-none'}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-0.5">
      {stars.map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= Math.round(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-none text-gray-300'
          }
        />
      ))}
    </div>
  );
}
