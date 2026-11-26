import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../config/api';

export const AdminFallDetection: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);

  const fetchEvents = async () => {
    try {
      const devRes = await apiRequest('/devices');
      if (devRes && devRes.length > 0) {
        const evRes = await apiRequest(`/fall-detection/device/${devRes[0].id}`);
        setEvents(evRes || []);
      }
    } catch (e) {
      console.error(e);
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
            Fleet Possible Fall Incidents
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Cross-field possible fall triggers reported by MPU6050 6-axis sensors
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-gray-200 dark:border-forest-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-forest-950/40 text-gray-500 uppercase text-[10px] font-semibold border-b border-gray-100 dark:border-forest-900">
              <tr>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Farmer / Device</th>
                <th className="py-3 px-4">Vector (X, Y, Z)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-forest-900 text-gray-700 dark:text-gray-300">
              {events.length > 0 ? (
                events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-3 px-4 font-bold text-rose-600 dark:text-rose-400">
                      {ev.event_type}
                    </td>
                    <td className="py-3 px-4 font-semibold">{ev.farmer_name}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {ev.accel_x?.toFixed(1) || 0}, {ev.accel_y?.toFixed(1) || 0}, {ev.accel_z?.toFixed(1) || 0}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Possible Fall
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{new Date(ev.timestamp).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No possible fall incidents recorded across the fleet.
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
