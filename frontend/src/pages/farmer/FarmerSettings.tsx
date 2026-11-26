import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Globe, Moon, Sun, Bell, Volume2, Shield } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const FarmerSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const [smsAlerts, setSmsAlerts] = useState(true);
  const [buzzerAudio, setBuzzerAudio] = useState(true);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('agrishield_language', lang);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Farmer Dashboard Settings
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure system language, color themes, and hardware alert thresholds
          </p>
        </div>

        {/* Language setting */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-leaf-600" />
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Interface Language</p>
              <p className="text-[11px] text-gray-500">English, ಕನ್ನಡ, हिंदी</p>
            </div>
          </div>
          <div className="flex space-x-1.5">
            <button
              onClick={() => changeLanguage('en')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                i18n.language === 'en' ? 'bg-leaf-600 text-white' : 'bg-gray-200 dark:bg-forest-900 text-gray-700 dark:text-gray-300'
              }`}
            >
              English
            </button>
            <button
              onClick={() => changeLanguage('kn')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                i18n.language === 'kn' ? 'bg-leaf-600 text-white' : 'bg-gray-200 dark:bg-forest-900 text-gray-700 dark:text-gray-300'
              }`}
            >
              ಕನ್ನಡ
            </button>
            <button
              onClick={() => changeLanguage('hi')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                i18n.language === 'hi' ? 'bg-leaf-600 text-white' : 'bg-gray-200 dark:bg-forest-900 text-gray-700 dark:text-gray-300'
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>

        {/* Theme setting */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Theme Mode</p>
              <p className="text-[11px] text-gray-500">Currently {theme === 'dark' ? 'Forest Dark' : 'Natural Light'}</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-forest-900 text-gray-800 dark:text-gray-200"
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* Audio / Buzzer setting */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Volume2 className="w-5 h-5 text-leaf-600" />
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Hardware Buzzer Alarm (GPIO 18)</p>
              <p className="text-[11px] text-gray-500">Audible warning signal during possible fall or high gas density</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={buzzerAudio}
            onChange={(e) => setBuzzerAudio(e.target.checked)}
            className="w-4 h-4 text-leaf-600 rounded cursor-pointer"
          />
        </div>

        {/* Emergency SMS Notifications */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-rose-500" />
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Emergency Contact SMS Broadcast</p>
              <p className="text-[11px] text-gray-500">Dispatch automated alerts with GPS coordinates to family contact</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={smsAlerts}
            onChange={(e) => setSmsAlerts(e.target.checked)}
            className="w-4 h-4 text-leaf-600 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
