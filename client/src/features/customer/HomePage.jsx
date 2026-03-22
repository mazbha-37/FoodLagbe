import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MapPin, Search, Locate, ChevronRight, X } from 'lucide-react';
import { selectIsAuthenticated } from '../auth/authSlice';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import LocationPicker from '../../components/map/LocationPicker';

const CUISINES = [
  { name: 'Bengali', emoji: '🍛' },
  { name: 'Chinese', emoji: '🥢' },
  { name: 'Indian', emoji: '🌶️' },
  { name: 'Fast Food', emoji: '🍔' },
  { name: 'Pizza', emoji: '🍕' },
  { name: 'Biryani', emoji: '🫕' },
  { name: 'Desserts', emoji: '🍰' },
  { name: 'Seafood', emoji: '🦐' },
];

async function forwardGeocode(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=bd&limit=5`,
    { headers: { 'Accept-Language': 'en' } }
  );
  if (!res.ok) return [];
  return res.json();
}

export default function HomePage() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try { setSearchResults(await forwardGeocode(val)); }
      finally { setSearching(false); }
    }, 500);
  };

  const selectResult = (r) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
    setAddress(r.display_name);
    setSearchQuery(r.display_name);
    setCoords({ lat, lng });
    setSearchResults([]);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.latitude}&lon=${c.longitude}&countrycodes=bd`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.display_name || `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`;
          setAddress(addr);
          setSearchQuery(addr);
        } finally { setLocating(false); }
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  };

  const [restaurantSearch, setRestaurantSearch] = useState('');

  const goToRestaurants = (cuisine) => {
    const params = new URLSearchParams();
    if (coords) { params.set('lat', coords.lat); params.set('lng', coords.lng); }
    if (address) params.set('address', address);
    if (cuisine) params.set('cuisine', cuisine);
    navigate(`/restaurants?${params.toString()}`);
  };

  const handleRestaurantSearch = (e) => {
    e.preventDefault();
    if (!restaurantSearch.trim()) return;
    const params = new URLSearchParams();
    params.set('search', restaurantSearch.trim());
    if (coords) { params.set('lat', coords.lat); params.set('lng', coords.lng); }
    if (address) params.set('address', address);
    navigate(`/restaurants?${params.toString()}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#E23744] to-[#c42f3a] text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            Hungry? We've got<br />you covered.
          </h1>
          <p className="text-lg text-red-100 mb-10">
            Order from your favorite restaurants in Bangladesh
          </p>

          {/* Location input */}
          <div className="bg-white rounded-[12px] p-4 shadow-lg">
            <p className="text-[#1C1C1C] font-semibold text-left mb-3 text-sm">
              Where should we deliver?
            </p>

            {/* Address input */}
            <div ref={searchRef} className="relative mb-3">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E23744]" />
              <input
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Enter your delivery address…"
                className="w-full pl-9 pr-9 py-3 border border-[#E0E0E0] rounded-[8px] text-sm text-[#1C1C1C] focus:outline-none focus:border-[#E23744]"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#E23744] border-t-transparent rounded-full animate-spin" />
              )}
              {searchQuery && !searching && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); setAddress(''); setCoords(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E808C]">
                  <X size={14} />
                </button>
              )}
              {searchResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-[#E0E0E0] rounded-[8px] shadow-md overflow-hidden text-left">
                  {searchResults.map((r) => (
                    <button key={r.place_id} onClick={() => selectResult(r)}
                      className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-[#F1F1F6] border-b border-[#E0E0E0] last:border-0">
                      <MapPin size={14} className="text-[#E23744] shrink-0 mt-0.5" />
                      <span className="text-sm text-[#1C1C1C] line-clamp-2">{r.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={useCurrentLocation}
                disabled={locating}
                className="flex items-center gap-1.5 text-sm text-[#E23744] hover:underline disabled:opacity-50"
              >
                <Locate size={14} />
                {locating ? 'Locating…' : 'Use current location'}
              </button>
              <span className="text-[#E0E0E0]">|</span>
              <button onClick={() => setShowMap(true)}
                className="flex items-center gap-1.5 text-sm text-[#7E808C] hover:text-[#1C1C1C]">
                <MapPin size={14} /> Pick on map
              </button>
            </div>

            <Button
              onClick={() => goToRestaurants()}
              fullWidth
              disabled={!coords && !address}
            >
              Find Restaurants <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </section>

      {/* Restaurant search */}
      <section className="max-w-2xl mx-auto px-4 pt-10 pb-2">
        <form onSubmit={handleRestaurantSearch} className="flex items-center gap-2 bg-white border border-[#E0E0E0] rounded-[10px] px-4 py-2.5 shadow-sm">
          <Search size={18} className="text-[#7E808C] shrink-0" />
          <input
            value={restaurantSearch}
            onChange={(e) => setRestaurantSearch(e.target.value)}
            placeholder="Search for a restaurant…"
            className="flex-1 text-sm text-[#1C1C1C] focus:outline-none placeholder:text-[#7E808C]"
          />
          <button
            type="submit"
            disabled={!restaurantSearch.trim()}
            className="text-sm font-medium text-[#E23744] hover:underline disabled:opacity-40 disabled:no-underline shrink-0"
          >
            Search
          </button>
        </form>
      </section>

      {/* Cuisines */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold text-[#1C1C1C] mb-6">What are you craving?</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {CUISINES.map((c) => (
            <button
              key={c.name}
              onClick={() => goToRestaurants(c.name)}
              className="flex flex-col items-center gap-2 p-3 bg-white rounded-[8px] shadow-sm hover:shadow-md hover:border-[#E23744] border border-[#E0E0E0] transition-all"
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-xs font-medium text-[#1C1C1C] text-center">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Map Modal */}
      <Modal isOpen={showMap} onClose={() => setShowMap(false)} title="Pick delivery location">
        <LocationPicker
          initialLocation={coords ? { latitude: coords.lat, longitude: coords.lng, address } : null}
          onLocationSelect={(loc) => {
            setAddress(loc.address);
            setSearchQuery(loc.address);
            setCoords({ lat: loc.latitude, lng: loc.longitude });
          }}
        />
        <div className="mt-4">
          <Button
            fullWidth
            onClick={() => setShowMap(false)}
            disabled={!coords}
          >
            Confirm Location
          </Button>
        </div>
      </Modal>
    </div>
  );
}
