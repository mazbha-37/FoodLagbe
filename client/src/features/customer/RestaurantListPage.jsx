import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Search, Star, Clock, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useGetRestaurantsQuery } from './customerApi';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'deliveryTime', label: 'Fastest Delivery' },
  { value: 'deliveryFee', label: 'Lowest Fee' },
];

const CUISINES = ['Bengali', 'Chinese', 'Indian', 'Fast Food', 'Pizza', 'Biryani', 'Desserts', 'Seafood', 'Burgers', 'Shawarma'];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[8px] shadow-sm overflow-hidden animate-pulse">
      <div className="bg-gray-200 h-40 w-full" />
      <div className="p-4 space-y-2">
        <div className="bg-gray-200 h-4 w-2/3 rounded" />
        <div className="bg-gray-200 h-3 w-1/2 rounded" />
        <div className="bg-gray-200 h-3 w-3/4 rounded" />
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant }) {
  const navigate = useNavigate();
  const isOpen = restaurant.isOpen;

  return (
    <div
      onClick={() => isOpen && navigate(`/restaurants/${restaurant._id}`)}
      className={`bg-white rounded-[8px] shadow-sm overflow-hidden border border-[#E0E0E0] transition-shadow ${
        isOpen ? 'cursor-pointer hover:shadow-md' : 'opacity-60 cursor-default'
      }`}
    >
      {/* Cover photo */}
      <div className="relative h-40">
        {restaurant.coverPhoto?.url ? (
          <img
            src={restaurant.coverPhoto.url}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#E23744]/20 to-[#FC8019]/20 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        {!isOpen && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-black/70 text-white text-sm font-semibold px-3 py-1 rounded-full">Closed</span>
          </div>
        )}
        {restaurant.distance != null && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <MapPin size={10} /> {restaurant.distance < 1 ? `${Math.round(restaurant.distance * 1000)}m` : `${restaurant.distance.toFixed(1)}km`}
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-[#1C1C1C] text-sm truncate">{restaurant.name}</h3>
        <p className="text-xs text-[#7E808C] truncate mt-0.5">
          {restaurant.cuisineTypes?.join(', ')}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-[#7E808C]">
          <span className="flex items-center gap-1 text-yellow-600">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            {restaurant.rating?.toFixed(1) || 'New'} ({restaurant.reviewCount || 0})
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {restaurant.deliveryTime || 30}–{(restaurant.deliveryTime || 30) + 10} min
          </span>
          <span>৳{restaurant.deliveryFee || 0} fee</span>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [cuisine, setCuisine] = useState(searchParams.get('cuisine') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'distance');
  const [page, setPage] = useState(1);

  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const address = searchParams.get('address');

  const queryParams = useMemo(() => ({
    ...(lat && { lat }),
    ...(lng && { lng }),
    ...(search && { search }),
    ...(cuisine && { cuisine }),
    sort,
    page,
    limit: 12,
  }), [lat, lng, search, cuisine, sort, page]);

  const { data, isLoading, isFetching } = useGetRestaurantsQuery(queryParams);

  const restaurants = data?.restaurants || [];
  const totalPages = data?.pages || 1;

  const updateFilter = (key, val) => {
    setPage(1);
    if (key === 'search') setSearch(val);
    if (key === 'cuisine') setCuisine(val === cuisine ? '' : val);
    if (key === 'sort') setSort(val);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top bar — address */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-[#E23744] shrink-0" />
          <p className="text-sm text-[#1C1C1C] truncate max-w-xs">
            {address || 'Dhaka, Bangladesh'}
          </p>
        </div>
        <Link to="/" className="text-sm text-[#E23744] hover:underline shrink-0">Change</Link>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-[8px] border border-[#E0E0E0] p-3 mb-5 flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7E808C]" />
          <input
            value={search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search restaurants…"
            className="w-full pl-9 pr-3 py-2 border border-[#E0E0E0] rounded-[6px] text-sm focus:outline-none focus:border-[#E23744]"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-[#E0E0E0] rounded-[6px] text-sm focus:outline-none focus:border-[#E23744] bg-white cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7E808C] pointer-events-none" />
          </div>

          {/* Cuisine chips */}
          <div className="flex-1 overflow-x-auto flex gap-2 pb-1 no-scrollbar">
            {CUISINES.map((c) => (
              <button
                key={c}
                onClick={() => updateFilter('cuisine', c)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  cuisine === c
                    ? 'bg-[#E23744] text-white border-[#E23744]'
                    : 'border-[#E0E0E0] text-[#7E808C] hover:border-[#E23744] hover:text-[#E23744]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Count */}
      {!isLoading && (
        <p className="text-sm text-[#7E808C] mb-4">
          {data?.total || 0} restaurants{cuisine ? ` for "${cuisine}"` : ''}{search ? ` matching "${search}"` : ''}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <span className="text-6xl">🍽️</span>
          <h3 className="text-lg font-semibold text-[#1C1C1C]">No restaurants found</h3>
          <p className="text-sm text-[#7E808C]">Try a different location or adjust your filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {restaurants.map((r) => <RestaurantCard key={r._id} restaurant={r} />)}
          </div>

          {/* Load more */}
          {page < totalPages && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching}
                className="px-6 py-2.5 border border-[#E23744] text-[#E23744] rounded-[6px] text-sm font-medium hover:bg-[#fff0f1] disabled:opacity-50 flex items-center gap-2"
              >
                {isFetching ? <LoadingSpinner size="sm" /> : null}
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
