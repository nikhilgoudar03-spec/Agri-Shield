import React, { useState, useEffect } from 'react';
import { FileText, Download, ShieldCheck, Printer } from 'lucide-react';
import { apiRequest } from '../../config/api';

export const AdminReports: React.FC = () => {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    apiRequest('/reports/summary').then(setReport).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Administrative Safety Reports & Compliance
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Fleet-wide safety compliance logs, incident tallies, and spray verification
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-leaf-600 hover:bg-leaf-700 text-white flex items-center space-x-1.5 shadow-md"
        >
          <Printer className="w-4 h-4" />
          <span>Export Summary Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
          <span className="text-xs text-gray-500">Compliance Rate</span>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{report?.safety_compliance_rate || '100%'}</h3>
          <p className="text-[11px] text-gray-400 mt-1">Acceptable vapor limits</p>
        </div>

        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
          <span className="text-xs text-gray-500">Possible Falls Logged</span>
          <h3 className="text-2xl font-black text-rose-600 mt-1">{report?.possible_falls_detected || 0}</h3>
          <p className="text-[11px] text-gray-400 mt-1">Impact triggers</p>
        </div>

        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
          <span className="text-xs text-gray-500">Elevated Gas Events</span>
          <h3 className="text-2xl font-black text-amber-600 mt-1">{report?.elevated_gas_incidents || 0}</h3>
          <p className="text-[11px] text-gray-400 mt-1">MQ-135 density spikes</p>
        </div>

        <div className="bg-white dark:bg-charcoal-900 p-5 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
          <span className="text-xs text-gray-500">Total Telemetry</span>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{report?.total_readings || 0}</h3>
          <p className="text-[11px] text-gray-400 mt-1">Received past 7 days</p>
        </div>
      </div>
    </div>
  );
};
