import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Mail, AlertCircle, CheckCircle, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';
import { apiRequest } from '../config/api';

export const ForgotPassword: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDevResetUrl(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      setSuccessMessage(res.message || 'If this email is registered, password reset instructions have been generated.');
      if (res.dev_reset_url) {
        setDevResetUrl(res.dev_reset_url);
      }
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Unable to process request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-charcoal-900 rounded-2xl shadow-xl border border-gray-100 dark:border-forest-900 p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-forest-600 to-leaf-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <KeyRound className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reset Password
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Enter your registered email address to receive password reset instructions
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-emerald-900 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Instructions Dispatched</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {successMessage}
            </p>
            {devResetUrl && (
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/60">
                <p className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 mb-1">
                  Local Dev Reset Link:
                </p>
                <a
                  href={devResetUrl}
                  className="text-[11px] text-leaf-600 dark:text-leaf-400 underline font-mono break-all"
                >
                  Click here to set your new password
                </a>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-forest-700 to-leaf-600 hover:from-forest-800 hover:to-leaf-700 shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Processing...' : 'Send Reset Instructions'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-gray-100 dark:border-forest-900 text-center">
          <Link
            to="/login"
            className="text-xs font-semibold text-leaf-600 dark:text-leaf-400 hover:underline inline-flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('auth.back_to_login')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
