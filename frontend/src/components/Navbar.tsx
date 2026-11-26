import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Sun, Moon, Globe, Menu, X, User, ShieldAlert } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAdmin, isFarmer } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('agrishield_language', lang);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#0c1410]/90 backdrop-blur-md border-b border-gray-200 dark:border-forest-900/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-forest-600 to-leaf-500 flex items-center justify-center text-white shadow-md shadow-forest-900/20 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-forest-900 dark:text-leaf-400">
                Agri<span className="text-leaf-600 dark:text-leaf-300">Shield</span>
              </span>
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 -mt-1">
                Smart Farmer Safety
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-leaf-600 dark:hover:text-leaf-400 transition-colors">
              {t('nav.home')}
            </Link>
            <a href="#about" className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-leaf-600 dark:hover:text-leaf-400 transition-colors">
              {t('nav.about')}
            </a>
            <a href="#features" className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-leaf-600 dark:hover:text-leaf-400 transition-colors">
              {t('nav.features')}
            </a>
            <a href="#technology" className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-leaf-600 dark:hover:text-leaf-400 transition-colors">
              {t('nav.technology')}
            </a>
            <a href="#contact" className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-leaf-600 dark:hover:text-leaf-400 transition-colors">
              {t('nav.contact')}
            </a>
          </nav>

          {/* Controls: Language, Theme, Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative flex items-center bg-gray-100 dark:bg-forest-950/60 rounded-lg px-2 py-1 text-xs border border-gray-200 dark:border-forest-800">
              <Globe className="w-3.5 h-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="bg-transparent text-gray-800 dark:text-gray-200 font-medium focus:outline-none cursor-pointer"
                aria-label="Language Selector"
              >
                <option value="en" className="dark:bg-charcoal-900">English</option>
                <option value="kn" className="dark:bg-charcoal-900">ಕನ್ನಡ (KN)</option>
                <option value="hi" className="dark:bg-charcoal-900">हिंदी (HI)</option>
              </select>
            </div>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-forest-900/50 transition-colors"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-forest-800" />}
            </button>

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate(user.role === 'ADMIN' ? '/admin/overview' : '/farmer/overview')}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-leaf-600 hover:bg-leaf-700 text-white shadow-sm flex items-center space-x-1.5 transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{t('nav.dashboard')} ({user.full_name.split(' ')[0]})</span>
                </button>
                <button
                  onClick={logout}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-forest-900/40"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-2 text-xs font-semibold text-forest-800 dark:text-leaf-300 hover:text-leaf-700 dark:hover:text-leaf-200 transition-colors"
                >
                  {t('nav.farmer_login')}
                </Link>
                <Link
                  to="/admin/login"
                  className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-forest-700 dark:hover:text-leaf-400 border border-gray-300 dark:border-forest-800 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <ShieldAlert className="w-3 h-3 text-amber-500" />
                  <span>{t('nav.admin_login')}</span>
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-forest-700 to-leaf-600 text-white hover:from-forest-800 hover:to-leaf-700 shadow-sm transition-all"
                >
                  {t('nav.get_started')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden space-x-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-forest-800" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 dark:text-gray-300"
              aria-label="Open Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 dark:border-forest-900 bg-white dark:bg-[#0c1410] px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-gray-800 dark:text-gray-200"
          >
            {t('nav.home')}
          </Link>
          <a
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-gray-800 dark:text-gray-200"
          >
            {t('nav.about')}
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-gray-800 dark:text-gray-200"
          >
            {t('nav.features')}
          </a>
          <a
            href="#technology"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-gray-800 dark:text-gray-200"
          >
            {t('nav.technology')}
          </a>

          {/* Mobile Language Switcher */}
          <div className="py-2 flex items-center justify-between border-t border-gray-200 dark:border-forest-900">
            <span className="text-xs text-gray-500 dark:text-gray-400">Language:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 text-xs rounded ${i18n.language === 'en' ? 'bg-leaf-600 text-white font-bold' : 'text-gray-600 dark:text-gray-300'}`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('kn')}
                className={`px-2 py-1 text-xs rounded ${i18n.language === 'kn' ? 'bg-leaf-600 text-white font-bold' : 'text-gray-600 dark:text-gray-300'}`}
              >
                ಕನ್ನಡ
              </button>
              <button
                onClick={() => changeLanguage('hi')}
                className={`px-2 py-1 text-xs rounded ${i18n.language === 'hi' ? 'bg-leaf-600 text-white font-bold' : 'text-gray-600 dark:text-gray-300'}`}
              >
                हिंदी
              </button>
            </div>
          </div>

          {/* Mobile Auth Buttons */}
          <div className="pt-2 border-t border-gray-200 dark:border-forest-900 space-y-2">
            {user ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(user.role === 'ADMIN' ? '/admin/overview' : '/farmer/overview');
                  }}
                  className="w-full text-center py-2.5 rounded-lg text-sm font-semibold bg-leaf-600 text-white"
                >
                  {t('nav.dashboard')}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-center py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-lg text-sm font-semibold border border-forest-600 text-forest-700 dark:text-leaf-300"
                >
                  {t('nav.farmer_login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-lg text-sm font-semibold bg-forest-700 text-white"
                >
                  {t('nav.get_started')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
