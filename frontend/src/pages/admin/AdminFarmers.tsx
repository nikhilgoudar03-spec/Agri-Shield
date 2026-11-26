import React, { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, Phone, MapPin, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../config/api';

export const AdminFarmers: React.FC = () => {
  const [farmers, setFarmers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiRequest(`/admin/farmers${q}`);
      setFarmers(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, [search]);

  const toggleStatus = async (farmerId: number, currentStatus: boolean) => {
    try {
      await apiRequest(`/admin/farmers/${farmerId}/status?is_active=${!currentStatus}`, {
        method: 'PUT',
      });
      fetchFarmers();
    } catch (e: any) {
      alert(e.message || 'Failed to update farmer status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Farmer Directory & Profile Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Verified agricultural users, device bindings, and emergency contacts
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, village..."
              className="pl-9 pr-4 py-2 text-xs rounded-xl bg-gray-50 dark:bg-forest-950/60 border border-gray-200 dark:border-forest-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-leaf-500"
            />
          </div>
          <button
            onClick={fetchFarmers}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-gray-200 dark:border-forest-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-forest-950/40 text-gray-500 uppercase text-[10px] font-semibold border-b border-gray-100 dark:border-forest-900">
              <tr>
                <th className="py-3 px-4">Farmer Name</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Village & District</th>
                <th className="py-3 px-4">Assigned Device</th>
                <th className="py-3 px-4">Emergency Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-forest-900 text-gray-700 dark:text-gray-300">
              {farmers.length > 0 ? (
                farmers.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50/50 dark:hover:bg-forest-950/20">
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                      {f.full_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-600 dark:text-gray-400">
                      {f.phone_number}
                    </td>
                    <td className="py-3 px-4">
                      {f.village ? `${f.village}, ${f.district}` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {f.assigned_device_uid ? (
                        <span className="font-mono px-2 py-0.5 rounded bg-leaf-50 dark:bg-forest-950 text-leaf-700 dark:text-leaf-300 border border-leaf-200 dark:border-forest-800 font-bold">
                          {f.assigned_device_uid}
                        </span>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      {f.emergency_contact_name} ({f.emergency_contact_phone})
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        f.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {f.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => toggleStatus(f.id, f.is_active)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                          f.is_active
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {f.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No farmers found.
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
