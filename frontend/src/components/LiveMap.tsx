import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin, Navigation, Compass, Radio, Satellite, Maximize2,
  Minimize2, Crosshair, Copy, Check, ExternalLink, ShieldCheck, RefreshCw
} from 'lucide-react';
import L from 'leaflet';
import { StatusBadge } from './StatusBadge';

interface TrailPoint {
  latitude: number;
  longitude: number;
  timestamp?: string;
  satellites?: number;
}

interface LiveMapProps {
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  speed?: number | null;
  satellites?: number | null;
  gpsFix?: boolean;
  timestamp?: string | null;
  connectionStatus?: string;
  deviceUid?: string;
  farmerName?: string;
  trail?: TrailPoint[];
  onRefresh?: () => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  latitude,
  longitude,
  altitude,
  speed,
  satellites,
  gpsFix = false,
  timestamp,
  connectionStatus = 'ONLINE',
  deviceUid = 'ESP32-AGRI-001',
  farmerName = 'Assigned Farmer',
  trail = [],
  onRefresh,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // STRICT VALIDATION: Coordinates are ONLY valid if non-zero, within physical Earth boundaries and gpsFix is true
  const hasValidFix =
    Boolean(gpsFix) &&
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    (latitude !== 0.0 || longitude !== 0.0) &&
    latitude >= -90.0 &&
    latitude <= 90.0 &&
    longitude >= -180.0 &&
    longitude <= 180.0;

  // Initialize or update Leaflet map
  useEffect(() => {
    if (!hasValidFix || !mapContainerRef.current) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        polylineRef.current = null;
      }
      return;
    }

    const lat = latitude as number;
    const lon = longitude as number;

    // Create custom pulsating GPS pin
    const customIcon = L.divIcon({
      className: 'custom-gps-pin-container',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
          <div class="gps-pulse-ring"></div>
          <div style="width: 18px; height: 18px; background-color: #16a34a; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.45); z-index: 2;"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });

    const popupContent = `
      <div style="font-family: inherit; font-size: 12px; line-height: 1.5; min-width: 200px; color: #1e293b;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-weight: 700; color: #15803d; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <span>🌾 ${farmerName}</span>
        </div>
        <div style="margin-bottom: 3px;"><b>Node:</b> <span style="font-family: monospace;">${deviceUid}</span></div>
        <div style="margin-bottom: 3px;"><b>Latitude:</b> <span style="font-family: monospace; font-weight: 600;">${lat.toFixed(6)}°</span></div>
        <div style="margin-bottom: 3px;"><b>Longitude:</b> <span style="font-family: monospace; font-weight: 600;">${lon.toFixed(6)}°</span></div>
        <div style="margin-bottom: 3px;"><b>Locked Sats:</b> ${satellites || '3+'} satellites</div>
        ${altitude ? `<div style="margin-bottom: 3px;"><b>Altitude:</b> ${altitude.toFixed(1)} m</div>` : ''}
        ${speed ? `<div style="margin-bottom: 3px;"><b>Speed:</b> ${speed.toFixed(1)} km/h</div>` : ''}
        <div style="margin-top: 6px; font-size: 10px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 4px; display: flex; justify-content: space-between;">
          <span>NEO-6M Physical Fix</span>
          <span>${timestamp ? new Date(timestamp).toLocaleTimeString() : 'Live'}</span>
        </div>
      </div>
    `;

    if (!mapInstanceRef.current) {
      // Create new map
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
      marker.bindPopup(popupContent).openPopup();

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      // Auto-center map smoothly when new coordinates arrive
      mapInstanceRef.current.flyTo([lat, lon], 16, { animate: true, duration: 1.2 });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
        markerRef.current.setPopupContent(popupContent);
      }
    }

    // Render breadcrumb trail if available
    if (trail.length > 1 && mapInstanceRef.current) {
      const validPoints: [number, number][] = trail
        .filter((pt) => pt.latitude && pt.longitude && pt.latitude !== 0 && pt.longitude !== 0)
        .map((pt) => [pt.latitude, pt.longitude]);

      if (validPoints.length > 1) {
        if (polylineRef.current) {
          polylineRef.current.setLatLngs(validPoints);
        } else {
          polylineRef.current = L.polyline(validPoints, {
            color: '#16a34a',
            weight: 3.5,
            opacity: 0.8,
            dashArray: '5, 8',
          }).addTo(mapInstanceRef.current);
        }
      }
    }

    // Force map size refresh
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  }, [hasValidFix, latitude, longitude, deviceUid, farmerName, satellites, altitude, speed, timestamp, trail]);

  // Handle window/container resize & fullscreen transition
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Recenter map on current coordinates
  const handleRecenter = () => {
    if (hasValidFix && mapInstanceRef.current && latitude && longitude) {
      mapInstanceRef.current.flyTo([latitude, longitude], 17, { animate: true, duration: 1.0 });
      markerRef.current?.openPopup();
    }
  };

  // Copy coordinates to clipboard
  const handleCopyCoordinates = () => {
    if (hasValidFix && latitude && longitude) {
      navigator.clipboard.writeText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  // Open in Google Maps in new tab
  const handleOpenExternalMaps = () => {
    if (hasValidFix && latitude && longitude) {
      window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank', 'noopener,noreferrer');
    }
  };

  const gpsBadgeStatus = hasValidFix
    ? (connectionStatus === 'OFFLINE' ? 'OFFLINE' : 'LIVE')
    : (timestamp ? 'GPS FIX NOT AVAILABLE' : 'NO DATA');

  return (
    <div
      className={`bg-white dark:bg-charcoal-900 rounded-2xl border border-gray-200 dark:border-forest-900 overflow-hidden shadow-sm transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-[100] rounded-none flex flex-col p-4 sm:p-6 bg-white dark:bg-charcoal-950 shadow-2xl' : 'relative'
      }`}
    >
      {/* Top Header Bar */}
      <div className="p-4 border-b border-gray-100 dark:border-forest-900 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-leaf-50 dark:bg-forest-950/80 border border-leaf-200 dark:border-forest-800 text-leaf-700 dark:text-leaf-300">
            <MapPin className="w-5 h-5 text-leaf-600 dark:text-leaf-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Physical NEO-6M Interactive Live GPS Map
              </h3>
              <StatusBadge status={gpsBadgeStatus} size="sm" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
              {hasValidFix
                ? `Lat: ${latitude?.toFixed(6)}°, Lon: ${longitude?.toFixed(6)}°`
                : (satellites ? `Satellites Visible: ${satellites} (Acquiring Ephemeris...)` : 'GPS FIX NOT AVAILABLE')}
            </p>
          </div>
        </div>

        {/* Action Controls & Telemetry Stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {satellites !== undefined && satellites !== null && (
            <div className="flex items-center space-x-1.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-forest-950/40 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-forest-800 font-medium">
              <Satellite className="w-3.5 h-3.5 text-leaf-600" />
              <span>Satellites: {satellites}</span>
            </div>
          )}

          {hasValidFix && (
            <>
              {speed !== undefined && speed !== null && speed > 0 && (
                <div className="hidden sm:flex items-center space-x-1.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-forest-950/40 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-forest-800">
                  <Navigation className="w-3.5 h-3.5 text-leaf-600" />
                  <span>{speed.toFixed(1)} km/h</span>
                </div>
              )}

              {altitude !== undefined && altitude !== null && altitude > 0 && (
                <div className="hidden sm:flex items-center space-x-1.5 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-forest-950/40 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-forest-800">
                  <Compass className="w-3.5 h-3.5 text-leaf-600" />
                  <span>{altitude.toFixed(0)}m Alt</span>
                </div>
              )}

              {/* Recenter Button */}
              <button
                onClick={handleRecenter}
                title="Recenter on Farmer Coordinates"
                className="p-2 rounded-xl bg-gray-100 dark:bg-forest-950/60 hover:bg-gray-200 dark:hover:bg-forest-900 text-gray-700 dark:text-gray-200 transition-colors"
              >
                <Crosshair className="w-4 h-4 text-leaf-600 dark:text-leaf-400" />
              </button>

              {/* Copy Coords */}
              <button
                onClick={handleCopyCoordinates}
                title="Copy Coordinates"
                className="p-2 rounded-xl bg-gray-100 dark:bg-forest-950/60 hover:bg-gray-200 dark:hover:bg-forest-900 text-gray-700 dark:text-gray-200 transition-colors flex items-center space-x-1"
              >
                {copiedCoords ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* External Maps */}
              <button
                onClick={handleOpenExternalMaps}
                title="Open in Google Maps"
                className="p-2 rounded-xl bg-gray-100 dark:bg-forest-950/60 hover:bg-gray-200 dark:hover:bg-forest-900 text-gray-700 dark:text-gray-200 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh GPS Stream"
              className="p-2 rounded-xl bg-gray-100 dark:bg-forest-950/60 hover:bg-gray-200 dark:hover:bg-forest-900 text-gray-700 dark:text-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen Map'}
            className="p-2 rounded-xl bg-leaf-50 dark:bg-forest-900 hover:bg-leaf-100 dark:hover:bg-forest-800 text-leaf-700 dark:text-leaf-300 transition-colors font-medium flex items-center space-x-1"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden md:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Map Display Container */}
      <div
        className={`relative w-full bg-gray-100 dark:bg-charcoal-950 flex items-center justify-center transition-all ${
          isFullscreen ? 'flex-1 h-full min-h-[500px]' : 'h-[420px] sm:h-[480px]'
        }`}
      >
        {hasValidFix ? (
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        ) : (
          <div className="text-center p-8 max-w-md space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                GPS FIX NOT AVAILABLE
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                The physical NEO-6M receiver is searching for satellite locks. To preserve data integrity and farmer safety, simulated positions and default pins are strictly never rendered.
              </p>
            </div>
            <div className="inline-flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-forest-950/40 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-forest-900">
              <Satellite className="w-4 h-4 text-leaf-500 shrink-0" />
              <span>Ensure NEO-6M ceramic patch antenna faces open sky directly.</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Bar */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-charcoal-850 border-t border-gray-100 dark:border-forest-900 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-leaf-600 shrink-0" />
          <span><b>Receiver:</b> NEO-6M Hardware UART (GPIO 16/17 @ 9600 Baud)</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span><b>Device Node:</b> {deviceUid}</span>
          <span><b>Status:</b> {connectionStatus}</span>
          <span><b>Last Sat Ping:</b> {timestamp ? new Date(timestamp).toLocaleTimeString() : 'Awaiting hardware'}</span>
        </div>
      </div>
    </div>
  );
};
