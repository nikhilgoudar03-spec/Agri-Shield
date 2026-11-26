import React, { useState, useEffect } from 'react';
import {
  Users, Cpu, AlertTriangle, Activity, ShieldAlert,
  CheckCircle2, Clock, RefreshCw, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../config/api';
import { StatusBadge } from '../../components/StatusBadge';

export const AdminOverview: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const res = await apiRequest('/admin/overview');
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            AgriShield Command & Security Portal
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time agricultural safety operations, active devices, and emergency response management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchOverview}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Registered Farmers</span>
            <Users className="w-4 h-4 text-leaf-600" />
          </div>
          <span className="text-3xl font-black text-gray-900 dark:text-white">
            {data?.total_farmers || 0}
          </span>
          <p className="text-[11px] text-gray-500">Verified mobile profiles</p>
        </div>

        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Hardware Devices</span>
            <Cpu className="w-4 h-4 text-forest-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {data?.total_devices || 0}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              ({data?.online_devices || 0} Online)
            </span>
          </div>
          <p className="text-[11px] text-gray-500">{data?.offline_devices || 0} Offline / Standby</p>
        </div>

        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Active Emergencies</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <span className={`text-3xl font-black ${
            (data?.active_emergencies || 0) > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'
          }`}>
            {data?.active_emergencies || 0}
          </span>
          <p className="text-[11px] text-gray-500">Require immediate response</p>
        </div>

        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Avg Sensor Climate</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {data?.sensor_summary?.avg_temperature_c || 28}°C • {data?.sensor_summary?.avg_humidity_pct || 60}%
          </span>
          <p className="text-[11px] text-gray-500">{data?.sensor_summary?.total_telemetry_records || 0} records logged</p>
        </div>
      </div>

      {/* Recent Safety Incidents Table */}
      <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-gray-200 dark:border-forest-900 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-forest-900 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Recent Safety Incidents & Telemetry Alerts
          </h3>
          <Link
            to="/admin/emergency"
            className="text-xs font-semibold text-leaf-600 dark:text-leaf-400 hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-forest-950/40 text-gray-500 uppercase text-[10px] font-semibold border-b border-gray-100 dark:border-forest-900">
              <tr>
                <th className="py-3 px-4">Alert Type</th>
                <th className="py-3 px-4">Farmer</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-forest-900 text-gray-700 dark:text-gray-300">
              {data?.recent_safety_events && data.recent_safety_events.length > 0 ? (
                data.recent_safety_events.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-gray-50/50 dark:hover:bg-forest-950/20">
                    <td className="py-3 px-4 font-bold text-rose-600 dark:text-rose-400">{ev.alert_type}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{ev.farmer_name}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">{ev.farmer_phone}</td>
                    <td className="py-3 px-4 max-w-xs truncate">{ev.message}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ev.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{new Date(ev.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No active emergency incidents reported.
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
