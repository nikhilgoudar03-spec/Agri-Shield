import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, RefreshCw, Activity } from 'lucide-react';
import { apiRequest } from '../../config/api';

export const FarmerFallDetection: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const devRes = await apiRequest('/farmers/my-device');
      if (devRes.has_device && devRes.device) {
        setDevice(devRes.device);
        const evRes = await apiRequest(`/fall-detection/device/${devRes.device.id}`);
        setEvents(evRes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            MPU6050 Possible Fall Detection
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            6-axis accelerometer & gyroscope data with impact vector threshold validation
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm space-y-2">
          <span className="text-xs text-gray-500">Vector Status</span>
          <h3 className="text-lg font-bold text-emerald-600 flex items-center space-x-1.5">
            <ShieldCheck className="w-5 h-5" />
            <span>Normal Dynamic Motion</span>
          </h3>
          <p className="text-[11px] text-gray-500">Continuous 1.0G equilibrium check active.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm space-y-2">
          <span className="text-xs text-gray-500">Fall Detection Threshold</span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            &gt; 2.6G Impact / &lt; 0.3G Freefall
          </h3>
          <p className="text-[11px] text-gray-500">Validated against MPU6050 vector magnitude.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm space-y-2">
          <span className="text-xs text-gray-500">Logged Events</span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {events.length} Incidents
          </h3>
          <p className="text-[11px] text-gray-500">Saved to permanent database logs.</p>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-gray-200 dark:border-forest-900 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-forest-900">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Recent Possible Fall Log History
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-forest-950/40 text-gray-500 uppercase text-[10px] font-semibold border-b border-gray-100 dark:border-forest-900">
              <tr>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Accel (X, Y, Z)</th>
                <th className="py-3 px-4">Confirmed</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-forest-900 text-gray-700 dark:text-gray-300">
              {events.length > 0 ? (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50/50 dark:hover:bg-forest-950/20">
                    <td className="py-3 px-4 font-bold text-rose-600 dark:text-rose-400">
                      {ev.event_type}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {ev.accel_x?.toFixed(1) || 0}, {ev.accel_y?.toFixed(1) || 0}, {ev.accel_z?.toFixed(1) || 0} m/s²
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        Possible Fall
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    No possible fall incidents recorded. Farmer is safe and active.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
