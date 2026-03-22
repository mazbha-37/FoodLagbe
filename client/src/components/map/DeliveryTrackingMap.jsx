import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored markers
const makeIcon = (color) =>
  L.divIcon({
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    className: '',
    iconAnchor: [8, 8],
  });

const RIDER_ICON = makeIcon('#3B82F6');   // blue
const CUSTOMER_ICON = makeIcon('#22C55E'); // green
const RESTAURANT_ICON = makeIcon('#EF4444'); // red

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    const valid = positions.filter(Boolean);
    if (valid.length < 1) return;
    if (valid.length === 1) { map.setView(valid[0], 15); return; }
    const bounds = L.latLngBounds(valid);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [positions.map(p => p?.join(',')).join('|')]);
  return null;
}

function AnimatedMarker({ position, icon, label }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.setLatLng(position);
    }
  }, [position]);

  if (!position) return null;

  return (
    <Marker ref={markerRef} position={position} icon={icon}>
      {label && <Popup>{label}</Popup>}
    </Marker>
  );
}

export default function DeliveryTrackingMap({
  riderLocation,
  customerLocation,
  restaurantLocation,
}) {
  const riderPos = riderLocation ? [riderLocation.latitude, riderLocation.longitude] : null;
  const customerPos = customerLocation ? [customerLocation.latitude, customerLocation.longitude] : null;
  const restaurantPos = restaurantLocation ? [restaurantLocation.latitude, restaurantLocation.longitude] : null;

  const defaultCenter = customerPos || restaurantPos || [23.8103, 90.4125];

  return (
    <div className="rounded-[8px] overflow-hidden border border-[#E0E0E0]" style={{ height: 280 }}>
      <MapContainer center={defaultCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds positions={[riderPos, customerPos, restaurantPos]} />
        <AnimatedMarker position={riderPos} icon={RIDER_ICON} label="Rider" />
        <AnimatedMarker position={customerPos} icon={CUSTOMER_ICON} label="Your Location" />
        <AnimatedMarker position={restaurantPos} icon={RESTAURANT_ICON} label="Restaurant" />
      </MapContainer>
    </div>
  );
}
