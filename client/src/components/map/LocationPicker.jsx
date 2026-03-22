import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Locate, Search, X, Loader } from 'lucide-react';

// Fix Leaflet default marker icon with React/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DHAKA = [23.8103, 90.4125];

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng),
  });
  return null;
}

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { animate: true, duration: 0.8 });
  }, [position, map]);
  return null;
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&countrycodes=bd`,
    { headers: { 'Accept-Language': 'en' } }
  );
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

async function forwardGeocode(query) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=bd&limit=5`,
    { headers: { 'Accept-Language': 'en' } }
  );
  if (!res.ok) return [];
  return res.json();
}

export default function LocationPicker({ onLocationSelect, initialLocation }) {
  const [position, setPosition] = useState(
    initialLocation ? [initialLocation.latitude, initialLocation.longitude] : null
  );
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef(null);
  const searchRef = useRef(null);

  const handleMapClick = useCallback(async ({ lat, lng }) => {
    setPosition([lat, lng]);
    try {
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      onLocationSelect?.({ address: addr, latitude: lat, longitude: lng });
    } catch {}
  }, [onLocationSelect]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await forwardGeocode(val);
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const selectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    setAddress(result.display_name);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    onLocationSelect?.({ address: result.display_name, latitude: lat, longitude: lng });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        setPosition([latitude, longitude]);
        try {
          const addr = await reverseGeocode(latitude, longitude);
          setAddress(addr);
          setSearchQuery(addr);
          onLocationSelect?.({ address: addr, latitude, longitude });
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7E808C]" />
          <input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search for an address…"
            className="w-full pl-9 pr-9 py-2.5 border border-[#E0E0E0] rounded-[6px] text-sm focus:outline-none focus:border-[#E23744] bg-white"
          />
          {searching && (
            <Loader size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E808C] animate-spin" />
          )}
          {searchQuery && !searching && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E808C] hover:text-[#1C1C1C]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {searchResults.length > 0 && (
          <div className="absolute z-[1000] left-0 right-0 top-full mt-1 bg-white border border-[#E0E0E0] rounded-[6px] shadow-md overflow-hidden">
            {searchResults.map((r) => (
              <button
                key={r.place_id}
                onClick={() => selectResult(r)}
                className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-[#F1F1F6] border-b border-[#E0E0E0] last:border-0"
              >
                <MapPin size={14} className="text-[#E23744] shrink-0 mt-0.5" />
                <span className="text-sm text-[#1C1C1C] line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Use current location */}
      <button
        onClick={useCurrentLocation}
        disabled={locating}
        className="flex items-center gap-2 text-sm text-[#E23744] hover:underline disabled:opacity-50"
      >
        <Locate size={16} />
        {locating ? 'Getting location…' : 'Use my current location'}
      </button>

      {/* Map */}
      <div className="rounded-[8px] overflow-hidden border border-[#E0E0E0]" style={{ height: 320 }}>
        <MapContainer
          center={position || DHAKA}
          zoom={position ? 16 : 12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ClickHandler onMapClick={handleMapClick} />
          {position && (
            <>
              <Marker position={position} />
              <FlyTo position={position} />
            </>
          )}
        </MapContainer>
      </div>

      {address && (
        <p className="text-xs text-[#7E808C] flex items-start gap-1.5">
          <MapPin size={12} className="text-[#E23744] shrink-0 mt-0.5" />
          {address}
        </p>
      )}
    </div>
  );
}
