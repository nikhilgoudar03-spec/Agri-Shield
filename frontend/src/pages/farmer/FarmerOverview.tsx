import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity, Thermometer, Droplets, AlertTriangle, MapPin,
  Bell, ShieldAlert, CheckCircle2, RefreshCw, Cpu
} from 'lucide-react';
import { apiRequest } from '../../config/api';
import { StatusBadge } from '../../components/StatusBadge';
import { LiveMap } from '../../components/LiveMap';

export const FarmerOverview: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosTriggering, setSosTriggering] = useState(false);
  const [sosSuccess, setSosSuccess] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      const res = await apiRequest('/farmers/dashboard-summary');
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000); // 10s poll

    // Also connect WebSocket for real-time telemetry updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'SENSOR_TELEMETRY' || msg.type === 'EMERGENCY_ALERT') {
            fetchSummary();
          }
        } catch (e) {}
      };
    } catch (e) {
      console.warn('WebSocket connection error:', e);
    }

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  const handleTriggerSOS = async () => {
    setSosTriggering(true);
    setSosSuccess(null);
    try {
      const res = await apiRequest('/emergency/manual-sos', {
        method: 'POST',
      });
      setSosSuccess('Emergency alert dispatched to your contacts and admin!');
      setSosModalOpen(false);
      fetchSummary();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch SOS alert.');
    } finally {
      setSosTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center space-x-2 text-leaf-600 font-semibold text-sm">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading Farmer Safety Overview...</span>
        </div>
      </div>
    );
  }

  const device = data?.device;
  const reading = data?.latest_reading;
  const gps = data?.latest_gps;
  const activeAlerts = data?.active_alerts || [];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Farmer Safety Center: {data?.farmer_name}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Registered Phone: {data?.phone_number} • Real-Time Field Telemetry
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSosModalOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-900/20 flex items-center space-x-1.5 animate-pulse-subtle"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{t('dashboard.trigger_sos')}</span>
          </button>

          <button
            onClick={fetchSummary}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SOS Success Message */}
      {sosSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sosSuccess}</span>
        </div>
      )}

      {/* Active Alerts Banner if any */}
      {activeAlerts.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 space-y-2">
          <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
            <span>CRITICAL ALERT ACTIVE ({activeAlerts.length})</span>
          </div>
          {activeAlerts.map((alt: any) => (
            <div key={alt.id} className="text-xs text-rose-700 dark:text-rose-400 flex justify-between items-center bg-white/60 dark:bg-black/20 p-2.5 rounded-lg">
              <span>{alt.message}</span>
              <span className="text-[10px] font-mono">{new Date(alt.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Device Status */}
        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('dashboard.device_status')}</span>
            <Cpu className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-gray-900 dark:text-white">
              {device ? device.device_uid : 'No Assigned Node'}
            </span>
            <StatusBadge status={device?.status || 'NO DATA'} size="sm" />
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {device?.last_heartbeat ? `Heartbeat: ${new Date(device.last_heartbeat).toLocaleTimeString()}` : 'Awaiting hardware link'}
          </p>
        </div>

        {/* MQ-135 Air Quality */}
        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('dashboard.mq135_title')}</span>
            <Activity className="w-4 h-4 text-leaf-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {reading?.mq135_ppm !== undefined && reading?.mq135_ppm !== null ? Math.round(reading.mq135_ppm) : '--'}
            </span>
            <span className="text-xs font-bold text-gray-500">Relative PPM</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-leaf-600 dark:text-leaf-400 font-semibold">{reading?.mq135_status || 'Normal Air'}</span>
            <StatusBadge status={reading?.data_freshness || 'NO DATA'} size="sm" />
          </div>
        </div>

        {/* DHT11 Temp & Humidity */}
        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">DHT11 Temperature & Humidity</span>
            <Thermometer className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                {reading?.temperature_c !== undefined && reading?.temperature_c !== null ? `${reading.temperature_c.toFixed(1)}°C` : '--'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {(reading?.humidity_percent !== undefined && reading?.humidity_percent !== null)
                  ? `• ${Math.round(reading.humidity_percent)}% RH`
                  : (reading?.humidity_pct !== undefined && reading?.humidity_pct !== null ? `• ${Math.round(reading.humidity_pct)}% RH` : '')}
              </span>
            </div>
            <StatusBadge
              status={
                reading?.sensor_status === 'SENSOR_ERROR'
                  ? 'SENSOR ERROR'
                  : (reading?.temperature_c === null || reading?.temperature_c === undefined ? 'NO DATA' : reading?.data_freshness || 'LIVE')
              }
              size="sm"
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-500 dark:text-gray-400">
            <span>Sensor Status: {reading?.sensor_status || 'Awaiting Hardware'}</span>
            <span>{reading?.received_at ? new Date(reading.received_at).toLocaleTimeString() : ''}</span>
          </div>
        </div>

        {/* MPU6050 Motion Status */}
        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('dashboard.motion_status')}</span>
            <AlertTriangle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Normal Movement</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            MPU6050 6-Axis Accelerometer
          </p>
        </div>
      </div>

      {/* Real-time Field GPS Map */}
      <div className="w-full">
        <LiveMap
          latitude={gps?.latitude}
          longitude={gps?.longitude}
          altitude={gps?.altitude_m || gps?.altitude}
          speed={gps?.speed}
          satellites={gps?.satellites}
          gpsFix={Boolean(gps?.gps_fix && gps?.latitude && gps?.longitude)}
          timestamp={gps?.received_at || gps?.timestamp}
          connectionStatus={device?.status || 'ONLINE'}
          deviceUid={device?.device_uid}
          farmerName={data?.farmer_name}
        />
      </div>

      {/* SOS Confirmation Modal */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-charcoal-900 rounded-3xl p-6 border border-rose-300 dark:border-rose-900 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Confirm Emergency SOS Broadcast?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {t('dashboard.sos_confirm')}
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSosModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-forest-950/60 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sosTriggering}
                onClick={handleTriggerSOS}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-900/30 flex items-center justify-center space-x-1"
              >
                <span>{sosTriggering ? 'Dispatching...' : 'Yes, Dispatch SOS!'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
