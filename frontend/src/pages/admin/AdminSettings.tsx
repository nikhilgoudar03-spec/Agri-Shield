import React, { useState } from 'react';
import { Settings, Shield, Server, Database, Globe, Moon, Sun, Save } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export const AdminSettings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { i18n } = useTranslation();

  const [mqThreshold, setMqThreshold] = useState(450);
  const [tempThreshold, setTempThreshold] = useState(38);
  const [fallSensitivity, setFallSensitivity] = useState('2.6G');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Administrative System Settings
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure safety thresholds, database connections, and operational parameters
          </p>
        </div>

        {saved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs text-emerald-800 dark:text-emerald-300">
            System configuration parameters successfully saved!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Thresholds */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Safety Trigger Thresholds
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Air Quality Warning (MQ-135 ppm)
                </label>
                <input
                  type="number"
                  value={mqThreshold}
                  onChange={(e) => setMqThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Heat Stress Threshold (°C)
                </label>
                <input
                  type="number"
                  value={tempThreshold}
                  onChange={(e) => setTempThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  MPU6050 Fall Threshold
                </label>
                <select
                  value={fallSensitivity}
                  onChange={(e) => setFallSensitivity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950 text-gray-900 dark:text-white"
                >
                  <option value="2.2G">2.2G (High Sensitivity)</option>
                  <option value="2.6G">2.6G (Balanced - Recommended)</option>
                  <option value="3.0G">3.0G (Low Sensitivity)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Backend Services */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 space-y-2 text-xs">
            <h4 className="font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-leaf-600" />
              <span>Database & Cloud Architecture</span>
            </h4>
            <p className="text-gray-500">
              Database: MySQL 8.0 with automatic SQLite high-availability fallback.
            </p>
            <p className="text-gray-500">
              Auth: MySQL Native Email & Password Authentication with bcrypt hashing and JWT sessions.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-xs text-white bg-leaf-600 hover:bg-leaf-700 shadow-md flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Apply Operational Settings</span>
          </button>
        </form>
      </div>
    </div>
  );
};
