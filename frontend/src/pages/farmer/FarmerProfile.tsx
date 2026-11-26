import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, HeartHandshake, CheckCircle2, Save } from 'lucide-react';
import { apiRequest } from '../../config/api';

export const FarmerProfile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Karnataka');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiRequest('/farmers/profile').then((res) => {
      setProfile(res);
      setVillage(res.village);
      setDistrict(res.district);
      setState(res.state || 'Karnataka');
      setEmergencyName(res.emergency_contact_name);
      setEmergencyPhone(res.emergency_contact_phone);
    }).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedMsg(false);
    try {
      const res = await apiRequest('/farmers/profile', {
        method: 'PUT',
        body: JSON.stringify({
          village,
          district,
          state,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
        }),
      });
      setProfile(res);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (e: any) {
      alert(e.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Farmer Profile & Emergency Contacts
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Keep your residential and family contact details up to date for emergency safety dispatches
        </p>

        {savedMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={profile?.full_name || ''}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-100 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Registered Mobile (+91)</label>
              <input
                type="text"
                disabled
                value={profile?.phone_number || ''}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-100 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 text-gray-600 dark:text-gray-400 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Village</label>
              <input
                type="text"
                required
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-forest-950/50 border border-gray-300 dark:border-forest-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">District</label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-forest-950/50 border border-gray-300 dark:border-forest-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">State</label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-forest-950/50 border border-gray-300 dark:border-forest-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center space-x-1.5">
              <HeartHandshake className="w-4 h-4" />
              <span>Emergency Family Member Contact</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-600 dark:text-gray-300 mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 dark:text-gray-300 mb-1">Contact Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-xs text-white bg-leaf-600 hover:bg-leaf-700 shadow-sm flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
