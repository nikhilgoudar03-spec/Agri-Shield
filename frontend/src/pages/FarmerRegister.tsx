import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Mail, Lock, User, MapPin, Phone, HeartHandshake, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { apiRequest } from '../config/api';

export const FarmerRegister: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirm_password: confirmPassword,
          village: village.trim(),
          district: district.trim(),
          emergency_contact_name: emergencyName.trim(),
          emergency_contact_mobile: emergencyPhone.trim(),
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { state: { registeredEmail: email.trim().toLowerCase() } });
      }, 1500);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-white dark:bg-charcoal-900 rounded-2xl shadow-xl border border-gray-100 dark:border-forest-900 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-forest-600 to-leaf-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Shield className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('auth.register_title')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Create an official AgriShield account for smart pesticide safety & fall monitoring
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="whitespace-pre-line leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>Registration successful! Redirecting you to Farmer Login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('auth.full_name')} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Gowda"
                required
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-leaf-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('auth.email_label')} *
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
                required
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-leaf-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.password_label')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password_placeholder')}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-leaf-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.confirm_password_label')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirm_password_placeholder')}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-leaf-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Location: Village & District */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.village')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="Kanakapura"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-leaf-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.district')} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Ramanagara"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-leaf-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-800 dark:text-rose-400">
              <HeartHandshake className="w-4 h-4" />
              <span>Emergency Contact (Family Member)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder={t('auth.emergency_name')}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-leaf-500 focus:outline-none"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder={t('auth.emergency_phone')}
                  required
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-leaf-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-forest-700 to-leaf-600 hover:from-forest-800 hover:to-leaf-700 shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? t('auth.creating_account') : t('auth.create_account')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-forest-900 text-center">
          <Link
            to="/login"
            className="text-xs font-semibold text-leaf-600 dark:text-leaf-400 hover:underline"
          >
            {t('auth.already_registered')}
          </Link>
        </div>
      </div>
    </div>
  );
};
