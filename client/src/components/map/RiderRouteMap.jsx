import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeColorIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 22px; height: 22px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

const RIDER_ICON = makeColorIcon('#3B82F6');
const RESTAURANT_ICON = makeColorIcon('#E23744');
const CUSTOMER_ICON = makeColorIcon('#60B246');

function FlyTo({ position }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!position) return;
    const str = JSON.stringify(position);
    if (str !== prev.current) {
      prev.current = str;
      map.flyTo(position, map.getZoom(), { animate: true, duration: 0.5 });
    }
  }, [position, map]);
  return null;
}

/**
 * RiderRouteMap
 * @param {[lat, lng]} riderPosition - current GPS of rider
 * @param {[lat, lng]} restaurantPosition - restaurant coords (shown during pickup)
 * @param {[lat, lng]} customerPosition - customer coords (shown during delivery)
 * @param {string} phase - 'pickup' | 'delivery'
 * @param {string} restaurantName
 * @param {string} customerName
 */
export default function RiderRouteMap({
  riderPosition,
  restaurantPosition,
  customerPosition,
  phase = 'pickup',
  restaurantName = 'Restaurant',
  customerName = 'Customer',
}) {
  const defaultCenter = riderPosition || [23.8103, 90.4125];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Rider marker — always shown */}
      {riderPosition && (
        <Marker position={riderPosition} icon={RIDER_ICON}>
          <Popup>You (Rider)</Popup>
        </Marker>
      )}

      {/* Restaurant marker — shown during pickup phase */}
      {phase === 'pickup' && restaurantPosition && (
        <Marker position={restaurantPosition} icon={RESTAURANT_ICON}>
          <Popup>{restaurantName}</Popup>
        </Marker>
      )}

      {/* Customer marker — shown during delivery phase */}
      {phase === 'delivery' && customerPosition && (
        <Marker position={customerPosition} icon={CUSTOMER_ICON}>
          <Popup>{customerName}</Popup>
        </Marker>
      )}

      {/* Auto-follow rider */}
      {riderPosition && <FlyTo position={riderPosition} />}
    </MapContainer>
  );
}
