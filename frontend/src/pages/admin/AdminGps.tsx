import React, { useState, useEffect } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../config/api';
import { LiveMap } from '../../components/LiveMap';

export const AdminGps: React.FC = () => {
  const [locations, setLocations] = useState<any[]>([]);

  const fetchGps = async () => {
    try {
      const res = await apiRequest('/gps/all-active');
      setLocations(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGps();
    const interval = setInterval(fetchGps, 10000);
    return () => clearInterval(interval);
  }, []);

  const first = locations[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Farmer Fleet GPS Field Map
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time coordinates of active sprayers and orchard workers
          </p>
        </div>
        <button
          onClick={fetchGps}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <LiveMap
        latitude={first?.latitude}
        longitude={first?.longitude}
        deviceUid={first?.device_uid}
        farmerName={first?.farmer_name}
        timestamp={first?.timestamp}
      />

      {/* Grid of active locations */}
      <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-gray-200 dark:border-forest-900 p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Active GPS Field Nodes ({locations.length})
        </h3>
        {locations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((loc) => (
              <div
                key={loc.device_id}
                className="p-3.5 rounded-xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 space-y-1 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 dark:text-white">{loc.farmer_name}</span>
                  <span className="font-mono text-[10px] text-leaf-600">{loc.device_uid}</span>
                </div>
                <p className="font-mono text-gray-600 dark:text-gray-300">
                  {loc.latitude?.toFixed(5)}° N, {loc.longitude?.toFixed(5)}° E
                </p>
                <p className="text-[10px] text-gray-400">
                  Last Fix: {new Date(loc.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Awaiting GPS satellite locks from active field units.</p>
        )}
      </div>
    </div>
  );
};
