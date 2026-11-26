import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { apiRequest } from '../config/api';
import { useAuth } from '../context/AuthContext';

export const FarmerLogin: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const prefilledEmail = (location.state as any)?.registeredEmail || '';
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          remember_me: rememberMe,
        }),
      });

      login(res);
      navigate('/farmer/overview');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email address or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-charcoal-900 rounded-2xl shadow-xl border border-gray-100 dark:border-forest-900 p-8">
        {/* Brand Icon */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-forest-600 to-leaf-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Shield className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('auth.farmer_login_title')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Access real-time safety monitoring, fall detection, and sensor alerts
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="whitespace-pre-line leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {t('auth.email_label')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder')}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-leaf-500 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {t('auth.password_label')}
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-leaf-600 dark:text-leaf-400 hover:underline font-medium"
              >
                {t('auth.forgot_password')}
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password_placeholder')}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-leaf-500 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-leaf-600 focus:ring-leaf-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
              {t('auth.remember_me')}
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-forest-700 to-leaf-600 hover:from-forest-800 hover:to-leaf-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? t('auth.signing_in') : t('auth.sign_in')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 pt-5 border-t border-gray-100 dark:border-forest-900 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('auth.new_farmer')}{' '}
            <Link
              to="/register"
              className="font-semibold text-leaf-600 dark:text-leaf-400 hover:underline ml-1"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
