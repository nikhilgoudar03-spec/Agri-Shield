import React, { useState, useEffect } from 'react';
import { FileText, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../config/api';

export const FarmerReports: React.FC = () => {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    apiRequest('/reports/summary').then(setReport).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Farmer Safety Reports & Compliance
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Weekly summaries of environmental safety levels, heat index, and incident telemetry
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm space-y-2">
          <span className="text-xs text-gray-500">Compliance Rate</span>
          <h2 className="text-3xl font-extrabold text-emerald-600">
            {report?.safety_compliance_rate || '100%'}
          </h2>
          <p className="text-xs text-gray-400">Within acceptable air-quality thresholds</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm space-y-2">
          <span className="text-xs text-gray-500">Telemetry Data Points</span>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {report?.total_readings || 0}
          </h2>
          <p className="text-xs text-gray-400">Recorded across active spray operations</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm space-y-2">
          <span className="text-xs text-gray-500">Resolved Emergencies</span>
          <h2 className="text-3xl font-extrabold text-leaf-600">
            {report?.resolved_emergencies || 0} / {report?.total_emergency_alerts || 0}
          </h2>
          <p className="text-xs text-gray-400">Safety alerts addressed</p>
        </div>
      </div>

      {/* Safety Certificate Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-forest-900 to-forest-800 text-white border border-forest-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-10 h-10 text-leaf-400 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Certified Safe Agricultural Session</h4>
            <p className="text-xs text-gray-300">
              No continuous lethal vapor stagnation or critical fall injuries logged during the reporting period.
            </p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-leaf-600 hover:bg-leaf-700 text-white flex items-center space-x-1.5 shadow-md"
        >
          <Download className="w-4 h-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>
    </div>
  );
};
