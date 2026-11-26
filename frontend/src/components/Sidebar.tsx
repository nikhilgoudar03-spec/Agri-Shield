import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, LayoutDashboard, Activity, AlertTriangle,
  MapPin, Bell, FileText, User, Settings, LogOut,
  Users, Cpu, BarChart3, History, Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  role: 'FARMER' | 'ADMIN';
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const farmerLinks = [
    { to: '/farmer/overview', label: t('dashboard.overview'), icon: LayoutDashboard },
    { to: '/farmer/live-sensors', label: t('dashboard.live_sensors'), icon: Activity },
    { to: '/farmer/fall-detection', label: t('dashboard.fall_detection'), icon: AlertTriangle },
    { to: '/farmer/gps', label: t('dashboard.gps_tracking'), icon: MapPin },
    { to: '/farmer/emergency', label: t('dashboard.emergency_alerts'), icon: Bell },
    { to: '/farmer/reports', label: t('dashboard.history_reports'), icon: FileText },
    { to: '/farmer/profile', label: t('dashboard.profile'), icon: User },
    { to: '/farmer/settings', label: t('dashboard.settings'), icon: Settings },
  ];

  const adminLinks = [
    { to: '/admin/overview', label: t('dashboard.overview'), icon: LayoutDashboard },
    { to: '/admin/farmers', label: t('dashboard.farmer_management'), icon: Users },
    { to: '/admin/devices', label: t('dashboard.device_management'), icon: Cpu },
    { to: '/admin/live-monitoring', label: t('dashboard.live_sensors'), icon: Activity },
    { to: '/admin/fall-detection', label: t('dashboard.fall_detection'), icon: AlertTriangle },
    { to: '/admin/emergency', label: t('dashboard.emergency_alerts'), icon: Bell },
    { to: '/admin/gps', label: t('dashboard.gps_tracking'), icon: MapPin },
    { to: '/admin/analytics', label: t('dashboard.sensor_analytics'), icon: BarChart3 },
    { to: '/admin/reports', label: t('dashboard.history_reports'), icon: FileText },
    { to: '/admin/audit-logs', label: t('dashboard.user_activity'), icon: History },
    { to: '/admin/settings', label: t('dashboard.settings'), icon: Settings },
  ];

  const links = role === 'ADMIN' ? adminLinks : farmerLinks;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('agrishield_language', lang);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-forest-950 text-gray-200 border-r border-forest-900/60 transition-transform duration-300 ease-in-out flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Header Brand */}
          <div className="h-16 px-6 border-b border-forest-900/60 flex items-center justify-between">
            <NavLink to="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-leaf-500 flex items-center justify-center text-white shadow-md">
                <Shield className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-bold text-lg text-white">Agri<span className="text-leaf-400">Shield</span></span>
                <span className="block text-[9px] uppercase tracking-wider text-leaf-300 font-semibold -mt-1">
                  {role === 'ADMIN' ? 'Admin Security' : 'Farmer Dashboard'}
                </span>
              </div>
            </NavLink>
          </div>

          {/* User Card */}
          <div className="px-4 py-3 mx-3 my-3 bg-forest-900/40 rounded-xl border border-forest-800/80">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-leaf-600/30 text-leaf-400 border border-leaf-500/30 flex items-center justify-center font-bold text-sm">
                {user?.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'AgriShield User'}</p>
                <p className="text-[11px] text-gray-400 truncate">{user?.phone_number || ''}</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-270px)] py-2">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-leaf-600 text-white font-semibold shadow-sm'
                        : 'text-gray-300 hover:bg-forest-900/50 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer actions: Language & Logout */}
        <div className="p-4 border-t border-forest-900/60 bg-forest-950/80 space-y-3">
          {/* Language Selector */}
          <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-forest-900/40 rounded-lg border border-forest-800">
            <span className="text-gray-400 flex items-center space-x-1">
              <Globe className="w-3.5 h-3.5" />
              <span>Language:</span>
            </span>
            <div className="flex space-x-1">
              <button
                onClick={() => changeLanguage('en')}
                className={`px-1.5 py-0.5 rounded text-[11px] ${i18n.language === 'en' ? 'bg-leaf-600 text-white font-bold' : 'text-gray-400'}`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('kn')}
                className={`px-1.5 py-0.5 rounded text-[11px] ${i18n.language === 'kn' ? 'bg-leaf-600 text-white font-bold' : 'text-gray-400'}`}
              >
                KN
              </button>
              <button
                onClick={() => changeLanguage('hi')}
                className={`px-1.5 py-0.5 rounded text-[11px] ${i18n.language === 'hi' ? 'bg-leaf-600 text-white font-bold' : 'text-gray-400'}`}
              >
                HI
              </button>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
