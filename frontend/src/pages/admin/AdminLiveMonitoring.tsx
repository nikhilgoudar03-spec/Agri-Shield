import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../config/api';
import { StatusBadge } from '../../components/StatusBadge';

export const AdminLiveMonitoring: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);

  const fetchLive = async () => {
    try {
      const res = await apiRequest('/devices');
      setDevices(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Live Field Telemetry Monitoring
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time multi-node stream from all deployed ESP32 DevKit V1 units
          </p>
        </div>
        <button
          onClick={fetchLive}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((d) => (
          <div
            key={d.id}
            className="p-5 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-forest-900">
              <div>
                <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">{d.device_uid}</span>
                <p className="text-[11px] text-gray-400">{d.device_name}</p>
              </div>
              <StatusBadge status={d.status} size="sm" />
            </div>

            <div className="text-xs space-y-1.5 text-gray-600 dark:text-gray-300">
              <p>Farmer: <strong>{d.assigned_farmer?.name || 'Unassigned'}</strong></p>
              <p>Phone: {d.assigned_farmer?.phone || '-'}</p>
              <p className="text-gray-400 text-[11px]">
                Last Heartbeat: {d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleTimeString() : 'Never'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
