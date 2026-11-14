import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Building, HeartHandshake } from 'lucide-react';

// Create custom SVG markers matching the Harvest Signal visual design system
function createCustomIcon(color, ringColor, label) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="36" height="44">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0B2118" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26c0-9.94-8.06-18-18-18z" 
            fill="${color}" filter="url(#shadow)"/>
      <circle cx="18" cy="18" r="8" fill="#FFFFFF"/>
      <circle cx="18" cy="18" r="5" fill="${ringColor}"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-marker',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40]
  });
}

const donorIcon = createCustomIcon('#0B2118', '#E8A46A', 'Donor');
const ngoIcon = createCustomIcon('#174C35', '#B9E76A', 'NGO');

// Component to dynamically fit bounds to include both points
function MapBoundsUpdater({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } catch (e) {
        // Fallback silently if single coordinate
      }
    }
  }, [map, points]);
  return null;
}

export default function RescueRouteMap({
  donorLocation,
  ngoLocation,
  distanceKm,
  transitMinutes,
  height = '320px',
  className = ''
}) {
  // Coordinates in GeoJSON are [longitude, latitude], Leaflet expects [latitude, longitude]
  const parseCoords = (coords, fallback) => {
    if (Array.isArray(coords) && coords.length === 2) {
      // Check if [lng, lat]
      const [a, b] = coords;
      if (a > 60 && a < 90) return [b, a]; // India lng range: a is lng, b is lat
      return [a, b];
    }
    return fallback;
  };

  const donorLatLng = parseCoords(
    donorLocation?.coordinates || donorLocation?.location?.coordinates,
    [12.9784, 77.6412] // Default Indiranagar, Bangalore
  );

  const ngoLatLng = parseCoords(
    ngoLocation?.coordinates || ngoLocation?.location?.coordinates,
    [12.9750, 77.6050] // Default Richmond Rd, Bangalore
  );

  const routePoints = [donorLatLng, ngoLatLng];
  const center = [
    (donorLatLng[0] + ngoLatLng[0]) / 2,
    (donorLatLng[1] + ngoLatLng[1]) / 2
  ];

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-border shadow-sm ${className}`} style={{ height }}>
      {/* Route Info Badge Overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border shadow-md flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-forest">
          <Navigation className="w-3.5 h-3.5 text-forest" />
          <span>{distanceKm ? `${distanceKm} km transit` : 'Redistribution Route'}</span>
        </div>
        {transitMinutes && (
          <span className="text-text-muted border-l border-border pl-3">
            ~{transitMinutes} mins driving
          </span>
        )}
      </div>

      {/* Legend Badge Overlay */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border shadow-sm flex items-center gap-3 text-[11px] text-text-muted">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-forest-dark border border-amber inline-block"></span>
          <span>Donor</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-forest border border-lime inline-block"></span>
          <span>Recipient NGO</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapBoundsUpdater points={routePoints} />

        {/* Route Line */}
        <Polyline
          positions={routePoints}
          pathOptions={{
            color: '#174C35',
            weight: 3.5,
            opacity: 0.85,
            dashArray: '8, 8'
          }}
        />

        {/* Donor Pin */}
        <Marker position={donorLatLng} icon={donorIcon}>
          <Popup>
            <div className="text-xs p-1">
              <div className="font-bold text-forest-dark flex items-center gap-1">
                <Building className="w-3 h-3 text-amber" />
                <span>{donorLocation?.name || 'Food Donor Pickup'}</span>
              </div>
              <p className="text-text-muted mt-0.5">{donorLocation?.address || 'Pickup bay loading zone'}</p>
            </div>
          </Popup>
        </Marker>

        {/* NGO Pin */}
        <Marker position={ngoLatLng} icon={ngoIcon}>
          <Popup>
            <div className="text-xs p-1">
              <div className="font-bold text-forest flex items-center gap-1">
                <HeartHandshake className="w-3 h-3 text-lime" />
                <span>{ngoLocation?.name || 'Recipient NGO Dropoff'}</span>
              </div>
              <p className="text-text-muted mt-0.5">{ngoLocation?.address || 'Receiving and dining center'}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
