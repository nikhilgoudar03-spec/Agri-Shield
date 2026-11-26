import React, { useState, useEffect } from 'react';
import { History, Shield, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../config/api';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/admin/audit-logs?limit=50');
      setLogs(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            System Security & User Activity Audit Trail
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Immutable logs of logins, device assignments, and administrative security actions
          </p>
        </div>
        <button
          onClick={fetchLogs}
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
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-forest-900 text-gray-700 dark:text-gray-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-forest-950/20">
                  <td className="py-3 px-4 font-mono font-bold text-leaf-700 dark:text-leaf-300">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    {log.user_name}
                  </td>
                  <td className="py-3 px-4 text-gray-500">{log.resource}</td>
                  <td className="py-3 px-4 max-w-sm truncate text-gray-600 dark:text-gray-300">{log.details}</td>
                  <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
