import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, PhoneCall, RefreshCw, Send, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../../config/api';

export const AdminEmergency: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/emergency/active');
      setAlerts(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 8000);
    return () => clearInterval(interval);
  }, []);

  const updateAlertStatus = async (alertId: number, newStatus: string) => {
    try {
      await apiRequest(`/emergency/${alertId}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchAlerts();
    } catch (e: any) {
      alert(e.message || 'Failed to update alert');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Emergency Dispatch & Incident Command
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Active possible falls, manual farmer SOS alerts, and emergency team dispatch
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {alerts.length > 0 ? (
          alerts.map((alt) => (
            <div
              key={alt.id}
              className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-rose-300 dark:border-rose-900 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                  <span className="font-extrabold text-rose-600 text-sm uppercase tracking-wide">
                    {alt.alert_type}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
                    {alt.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {alt.message}
                </h3>

                <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-300 pt-1">
                  <p>Farmer: <strong>{alt.farmer_name}</strong> ({alt.farmer_phone})</p>
                  <p className="text-amber-600 dark:text-amber-400">
                    Family Contact: <strong>{alt.emergency_contact_name}</strong> ({alt.emergency_contact_phone})
                  </p>
                  {alt.latitude && (
                    <p className="font-mono text-emerald-600">
                      GPS: {alt.latitude.toFixed(5)}°, {alt.longitude.toFixed(5)}°
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0">
                {alt.status === 'ACTIVE' && (
                  <button
                    onClick={() => updateAlertStatus(alt.id, 'DISPATCHED')}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center space-x-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Mark Dispatched</span>
                  </button>
                )}
                <button
                  onClick={() => updateAlertStatus(alt.id, 'RESOLVED')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve Incident</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-gray-200 dark:border-forest-900 p-12 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">No Active Emergencies</h3>
            <p className="text-xs text-gray-400">All registered farmers and field nodes are operating securely.</p>
          </div>
        )}
      </div>
    </div>
  );
};
