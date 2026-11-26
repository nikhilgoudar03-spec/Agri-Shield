import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Activity, Thermometer, Droplets, RefreshCw, AlertCircle, Wifi, Clock } from 'lucide-react';
import { apiRequest } from '../../config/api';
import { StatusBadge } from '../../components/StatusBadge';

export const FarmerLiveSensors: React.FC = () => {
  const [device, setDevice] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [latest, setLatest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  const fetchData = async () => {
    try {
      const devRes = await apiRequest('/farmers/my-device');
      if (devRes.has_device && devRes.device) {
        setDevice(devRes.device);
        const [histRes, liveRes] = await Promise.all([
          apiRequest(`/telemetry/history?limit=30`).catch(() => []),
          apiRequest(`/telemetry/latest`).catch(() => null),
        ]);
        setHistory(histRes || []);
        if (liveRes) setLatest(liveRes);
      }
    } catch (e) {
      console.error('Failed to fetch sensor telemetry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000); // 10s fallback poll

    // Authenticated WebSocket connection for instantaneous live telemetry
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
            if (msg.type === 'SENSOR_TELEMETRY') {
              setLatest((prev: any) => ({
                ...prev,
                temperature_c: msg.temperature_c,
                humidity_percent: msg.humidity_percent,
                humidity_pct: msg.humidity_percent,
                sensor_status: msg.sensor_status,
                mq135_raw: msg.mq135_raw,
                mq135_ppm: msg.mq135_ppm,
                mq135_status: msg.mq135_status,
                data_freshness: msg.data_freshness,
                received_at: msg.received_at,
                timestamp: msg.timestamp,
              }));

              // Append to history buffer if valid
              setHistory((prev) => [
                ...prev.slice(-29),
                {
                  timestamp: new Date().toLocaleTimeString(),
                  temperature_c: msg.temperature_c,
                  humidity_pct: msg.humidity_percent,
                  humidity_percent: msg.humidity_percent,
                  mq135_raw: msg.mq135_raw,
                  mq135_ppm: msg.mq135_ppm,
                },
              ]);
            }
          } catch (e) {
            console.error('Error parsing live WS payload:', e);
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
      clearInterval(timer);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  // Compute status labels according to Section 7 requirements
  const getSensorStatusLabel = (fieldValue: any, sensorStatus?: string, freshness?: string) => {
    if (sensorStatus === 'SENSOR_ERROR' || sensorStatus === 'DISCONNECTED') {
      return 'SENSOR ERROR';
    }
    if (fieldValue === null || fieldValue === undefined) {
      return 'NO DATA';
    }
    if (freshness === 'STALE') return 'STALE';
    if (freshness === 'OFFLINE') return 'OFFLINE';
    return freshness || 'LIVE';
  };

  const tempStatus = getSensorStatusLabel(latest?.temperature_c, latest?.sensor_status, latest?.data_freshness);
  const humStatus = getSensorStatusLabel(latest?.humidity_percent || latest?.humidity_pct, latest?.sensor_status, latest?.data_freshness);

  const formatLastUpdated = (isoString?: string) => {
    if (!isoString) return 'No readings yet';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Physical Sensor Telemetry & Diagnostics
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
            Real-time measurements from physical ESP32 DHT11 and MQ-135 sensors. Never displays simulated or demo values.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Real-time Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* A. Temperature Card */}
        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">
                DHT11 Ambient Temperature
              </span>
              <p className="text-[11px] text-gray-400">Physical GPIO 4 Sensor</p>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
              <Thermometer className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">
              {latest?.temperature_c !== null && latest?.temperature_c !== undefined
                ? `${Number(latest.temperature_c).toFixed(1)}°C`
                : '--'}
            </span>
            <StatusBadge status={tempStatus} size="sm" />
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-forest-950 flex flex-col space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            <div className="flex items-center justify-between">
              <span>Sensor Status:</span>
              <span className={`font-semibold ${latest?.sensor_status === 'SENSOR_ERROR' ? 'text-rose-500' : 'text-leaf-600'}`}>
                {latest?.sensor_status || 'Awaiting Hardware'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>Last Updated:</span>
              </span>
              <span className="font-mono">{formatLastUpdated(latest?.received_at || latest?.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* B. Humidity Card */}
        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">
                DHT11 Relative Humidity
              </span>
              <p className="text-[11px] text-gray-400">Microclimate Field Moisture</p>
            </div>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/60">
              <Droplets className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">
              {latest?.humidity_percent !== null && latest?.humidity_percent !== undefined
                ? `${Math.round(latest.humidity_percent)}%`
                : (latest?.humidity_pct !== null && latest?.humidity_pct !== undefined ? `${Math.round(latest.humidity_pct)}%` : '--')}
            </span>
            <StatusBadge status={humStatus} size="sm" />
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-forest-950 flex flex-col space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            <div className="flex items-center justify-between">
              <span>Sensor Status:</span>
              <span className={`font-semibold ${latest?.sensor_status === 'SENSOR_ERROR' ? 'text-rose-500' : 'text-leaf-600'}`}>
                {latest?.sensor_status || 'Awaiting Hardware'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>Last Updated:</span>
              </span>
              <span className="font-mono">{formatLastUpdated(latest?.received_at || latest?.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Air Quality (MQ-135) Card */}
        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">
                MQ-135 Air-Quality Fluctuation
              </span>
              <p className="text-[11px] text-gray-400">General Air & Vapor Relative Index</p>
            </div>
            <div className="p-2 rounded-xl bg-leaf-50 dark:bg-leaf-950/40 text-leaf-600 dark:text-leaf-400 border border-leaf-200 dark:border-leaf-900/60">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">
              {latest?.mq135_raw !== undefined && latest?.mq135_raw !== null
                ? latest.mq135_raw
                : (latest?.mq135_ppm ? Math.round(latest.mq135_ppm) : '--')}
            </span>
            <span className="text-xs text-gray-500 font-mono">
              {latest?.mq135_raw !== undefined && latest?.mq135_raw !== null ? 'ADC (0-1023)' : 'PPM'}
            </span>
            <StatusBadge status={latest?.data_freshness || 'NO DATA'} size="sm" />
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-forest-950 flex flex-col space-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            {latest?.mq135_raw !== undefined && latest?.mq135_raw !== null && (
              <div className="flex items-center justify-between">
                <span>MQ-135 Raw ADC:</span>
                <span className="font-mono font-semibold text-leaf-600 dark:text-leaf-400">
                  {latest.mq135_raw} / 1023
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Index Status:</span>
              <span className="font-semibold text-leaf-600 dark:text-leaf-400">
                {latest?.mq135_status || 'Normal'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>Last Updated:</span>
              </span>
              <span className="font-mono">{formatLastUpdated(latest?.received_at || latest?.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* History Line Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Temperature History Chart */}
        <div className="bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                DHT11 Temperature History (°C)
              </h3>
            </div>
            <span className="text-xs text-gray-400">Past 30 Readings</span>
          </div>

          {history.length > 0 && history.some((h) => h.temperature_c !== null && h.temperature_c !== undefined) ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="timestamp" stroke="#888888" fontSize={10} />
                  <YAxis stroke="#888888" fontSize={10} domain={['auto', 'auto']} unit="°C" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111d16',
                      borderColor: '#245740',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature_c"
                    name="Temperature (°C)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-charcoal-950 rounded-xl border border-dashed border-gray-200 dark:border-forest-900">
              <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                NO TEMPERATURE HISTORY RECORDED
              </p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                Physical sensor history will plot dynamically once the ESP32 DHT11 node transmits live readings.
              </p>
            </div>
          )}
        </div>

        {/* Humidity History Chart */}
        <div className="bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Droplets className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                DHT11 Relative Humidity History (%)
              </h3>
            </div>
            <span className="text-xs text-gray-400">Past 30 Readings</span>
          </div>

          {history.length > 0 && history.some((h) => (h.humidity_percent || h.humidity_pct) !== null && (h.humidity_percent || h.humidity_pct) !== undefined) ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="timestamp" stroke="#888888" fontSize={10} />
                  <YAxis stroke="#888888" fontSize={10} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111d16',
                      borderColor: '#245740',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity_pct"
                    name="Humidity (%)"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-charcoal-950 rounded-xl border border-dashed border-gray-200 dark:border-forest-900">
              <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                NO HUMIDITY HISTORY RECORDED
              </p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                Physical sensor history will plot dynamically once the ESP32 DHT11 node transmits live readings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
