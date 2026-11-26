import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../../config/api';

export const FarmerEmergency: React.FC = () => {
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const [act, hist] = await Promise.all([
        apiRequest('/emergency/active'),
        apiRequest('/emergency/history'),
      ]);
      setActiveAlerts(act || []);
      setHistory(hist || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Emergency Alerts & Family Contacts
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Active and resolved safety incidents with SMS dispatch records
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600">Active High-Priority Alerts</h3>
          <div className="grid grid-cols-1 gap-3">
            {activeAlerts.map((alt) => (
              <div
                key={alt.id}
                className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-sm text-rose-900 dark:text-rose-200">{alt.alert_type}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
                      {alt.status}
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 dark:text-rose-300">{alt.message}</p>
                  <p className="text-[11px] text-gray-500">
                    Emergency Contact: {alt.emergency_contact_phone} • Dispatched: {new Date(alt.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-gray-200 dark:border-forest-900 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-forest-900">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Emergency History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-forest-950/40 text-gray-500 uppercase text-[10px] font-semibold border-b border-gray-100 dark:border-forest-900">
              <tr>
                <th className="py-3 px-4">Alert Type</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-forest-900 text-gray-700 dark:text-gray-300">
              {history.length > 0 ? (
                history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-3 px-4 font-bold">{h.alert_type}</td>
                    <td className="py-3 px-4">{h.message}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        h.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{new Date(h.created_at).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">
                    No emergency history logged.
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
