import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { apiRequest } from '../config/api';
import { useAuth } from '../context/AuthContext';

export const AdminLogin: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (res.role !== 'ADMIN') {
        throw new Error('Access denied: You do not possess administrator credentials.');
      }

      setSuccess('Authentication successful! Redirecting to Admin Dashboard...');
      login(res);
      setTimeout(() => {
        navigate('/admin/overview');
      }, 600);
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError(err.message || 'Invalid administrator email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-charcoal-900 rounded-2xl shadow-xl border border-gray-100 dark:border-forest-900 p-8 sm:p-10 transition-all">
        {/* AgriShield Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-forest-800 via-forest-900 to-charcoal-900 text-leaf-400 rounded-2xl flex items-center justify-center mx-auto shadow-md mb-3 ring-4 ring-forest-50 dark:ring-forest-900/30">
            <Shield className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AgriShield
          </h1>
          <p className="text-xs font-semibold text-forest-700 dark:text-leaf-400 mt-1 uppercase tracking-wider">
            Administrator Login
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="whitespace-pre-line leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{success}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleAdminLogin} className="space-y-5">
          {/* Administrator Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Administrator Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nikhilgodar03@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-forest-600 focus:outline-none transition-all font-mono"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Administrator Password with Show/Hide Toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Administrator Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-forest-600 focus:outline-none transition-all"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-forest-800 via-forest-900 to-charcoal-900 hover:from-forest-900 hover:to-black shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Login</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
