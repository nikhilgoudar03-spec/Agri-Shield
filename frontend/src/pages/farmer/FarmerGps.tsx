import React, { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Satellite, Navigation, Compass, AlertCircle, Wifi } from 'lucide-react';
import { apiRequest } from '../../config/api';
import { LiveMap } from '../../components/LiveMap';
import { StatusBadge } from '../../components/StatusBadge';

export const FarmerGps: React.FC = () => {
  const [device, setDevice] = useState<any>(null);
  const [gps, setGps] = useState<any>(null);
  const [trail, setTrail] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  const fetchGps = async () => {
    try {
      const devRes = await apiRequest('/farmers/my-device');
      if (devRes.has_device && devRes.device) {
        setDevice(devRes.device);
        const [gpsRes, trailRes] = await Promise.all([
          apiRequest(`/gps/latest`).catch(() => null),
          apiRequest(`/gps/history?limit=30`).catch(() => []),
        ]);
        if (gpsRes) setGps(gpsRes);
        setTrail(trailRes || []);
      }
    } catch (e) {
      console.error('Error loading GPS telemetry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGps();
    const interval = setInterval(fetchGps, 10000);

    // Live WebSocket connection for instant GPS fixes
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          setWsConnected(true);
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'GPS_UPDATE') {
              setGps((prev: any) => ({
                ...prev,
                latitude: msg.latitude,
                longitude: msg.longitude,
                satellites: msg.satellites,
                gps_fix: msg.gps_fix,
                altitude_m: msg.altitude_m,
                altitude: msg.altitude_m,
                speed: msg.speed,
                received_at: msg.received_at,
                timestamp: msg.timestamp,
              }));

              if (msg.gps_fix && msg.latitude && msg.longitude) {
                setTrail((prev) => [
                  ...prev.slice(-29),
                  {
                    latitude: msg.latitude,
                    longitude: msg.longitude,
                    satellites: msg.satellites,
                    speed: msg.speed,
                    timestamp: new Date().toLocaleTimeString(),
                  },
                ]);
              }
            }
          } catch (e) {
            console.error('Error parsing live GPS WebSocket message:', e);
          }
        };
        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 5000);
        };
        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (e) {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWs, 5000);
      }
    };

    connectWs();

    return () => {
      clearInterval(interval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  const hasFix = Boolean(gps?.gps_fix && gps?.latitude && gps?.longitude);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              NEO-6M GPS Field Navigation & Tracking
            </h1>
            <span
              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                wsConnected
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
              }`}
            >
              <Wifi className="w-2.5 h-2.5" />
              <span>{wsConnected ? 'WebSocket Live' : 'Polling Sync'}</span>
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real satellite coordinates acquired via ESP32 Hardware UART. Strict policy: Never displays fake coordinates or simulated default pins.
          </p>
        </div>
        <button
          onClick={fetchGps}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
          title="Refresh GPS"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Interactive Map Card */}
      <LiveMap
        latitude={gps?.latitude}
        longitude={gps?.longitude}
        altitude={gps?.altitude_m || gps?.altitude}
        speed={gps?.speed}
        satellites={gps?.satellites}
        gpsFix={hasFix}
        timestamp={gps?.received_at || gps?.timestamp}
        connectionStatus={device ? device.status : 'OFFLINE'}
        deviceUid={device?.device_uid}
        farmerName={device?.device_name || 'Field Unit'}
        trail={trail}
        onRefresh={fetchGps}
      />

      {/* Breadcrumb Trail (Real Historical Positions Only) */}
      <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-gray-200 dark:border-forest-900 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Field Breadcrumbs (Actual GPS Trail Points)
          </h3>
          <span className="text-[11px] text-gray-400">
            {trail.length} Valid Historical Fixes
          </span>
        </div>

        {trail.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {trail.slice(0, 8).map((pt, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 flex flex-col space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span className="font-mono">{pt.timestamp}</span>
                  {pt.satellites && (
                    <span className="text-leaf-600 dark:text-leaf-400 flex items-center space-x-0.5">
                      <Satellite className="w-2.5 h-2.5" />
                      <span>{pt.satellites} sats</span>
                    </span>
                  )}
                </div>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {pt.latitude?.toFixed(5)}°, {pt.longitude?.toFixed(5)}°
                </span>
                {pt.speed > 0 && (
                  <span className="text-[10px] text-gray-500">Speed: {pt.speed.toFixed(1)} km/h</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-forest-950/30 text-center text-xs text-gray-400">
            No valid GPS breadcrumbs recorded yet. Breadcrumbs will record once satellite fix is locked.
          </div>
        )}
      </div>
    </div>
  );
};
