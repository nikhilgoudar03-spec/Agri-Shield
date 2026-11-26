import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { apiRequest } from '../config/api';

interface PasswordCriteria {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export const AdminSetup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form Fields
  const [setupToken, setSetupToken] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(3);

  // Initialize token from query parameter if present
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setSetupToken(tokenParam.trim());
    }
  }, [searchParams]);

  // Password criteria check
  const criteria: PasswordCriteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
  };

  const criteriaCount = Object.values(criteria).filter(Boolean).length;
  const isPasswordValid = criteriaCount === 5;
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  // Strength calculation: 0-4
  const getStrengthInfo = () => {
    if (password.length === 0) return { label: 'Empty', bgHex: '#9ca3af', text: 'text-gray-400', width: '0%' };
    if (criteriaCount <= 2) return { label: 'Weak', bgHex: '#f43f5e', text: 'text-rose-500', width: '25%' };
    if (criteriaCount === 3) return { label: 'Fair', bgHex: '#f59e0b', text: 'text-amber-500', width: '50%' };
    if (criteriaCount === 4) return { label: 'Good', bgHex: '#eab308', text: 'text-yellow-500', width: '75%' };
    return { label: 'Strong & Secure', bgHex: '#10b981', text: 'text-emerald-500', width: '100%' };
  };

  const strength = getStrengthInfo();

  // Handle countdown on success
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
    } else if (success && redirectCountdown === 0) {
      navigate('/admin/login', { state: { registeredEmail: email.trim().toLowerCase() } });
    }
    return () => clearTimeout(timer);
  }, [success, redirectCountdown, navigate, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!setupToken.trim()) {
      setError('Administrator setup token is required. Public registration is strictly prohibited.');
      return;
    }

    if (!fullName.trim()) {
      setError('Please provide the full name of the administrator.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid administrator email address.');
      return;
    }

    if (!isPasswordValid) {
      setError('Please ensure your password meets all 5 security strength requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest('/auth/admin/setup', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirm_password: confirmPassword,
          setup_token: setupToken.trim(),
        }),
      });

      setSuccess(`Administrator account for ${res.email} was successfully provisioned!`);
    } catch (err: any) {
      console.error('Admin setup error:', err);
      setError(err.message || 'Administrator account creation failed. Verify your setup token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-gray-50 to-emerald-50/20 dark:from-charcoal-950 dark:to-[#08100c]">
      <div className="max-w-xl w-full bg-white dark:bg-charcoal-900 rounded-3xl shadow-2xl border border-forest-100 dark:border-forest-900/60 p-8 sm:p-10 transition-all">
        {/* Header with AgriShield Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-forest-800 via-forest-900 to-charcoal-900 text-leaf-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-forest-900/20 mb-4 ring-4 ring-forest-100 dark:ring-forest-900/40">
            <ShieldCheck className="w-9 h-9 stroke-[2.2]" />
          </div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-forest-100 dark:bg-forest-900/60 text-forest-800 dark:text-leaf-300 mb-2">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Authorized Administrator Provisioning</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Create Admin Account
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            AgriShield Smart Farmer Safety Platform • Central Administration & Node Fleet Management
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Security Requirement:</span> Public registration is disabled. You must provide a valid one-time administrator setup token or have an active system administrator authorization.
          </div>
        </div>

        {/* Success Banner */}
        {success && (
          <div className="mb-8 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Account Successfully Provisioned!</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">{success}</p>
                <div className="mt-3 flex items-center space-x-3">
                  <Link
                    to="/admin/login"
                    className="inline-flex items-center space-x-1 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition"
                  >
                    <span>Proceed to Admin Login ({redirectCountdown}s)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="whitespace-pre-line leading-relaxed">{error}</div>
          </div>
        )}

        {/* Admin Setup Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Setup Token */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Administrator Setup Token <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400">From Admin Invite / .env</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-forest-700 dark:text-leaf-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  placeholder="Enter setup token (e.g. agri_adm_... or master token)"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-forest-600 focus:outline-none transition-all"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                Required for security verification to prevent unauthorized admin creation.
              </p>
            </div>

            {/* 2. Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Administrator Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Rajesh Kumar, Lead Safety Engineer"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-forest-600 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* 3. Administrator Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Administrator Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin.safety@agrishield.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-forest-600 focus:outline-none transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* 4. Password with Strength Indicator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Administrator Password <span className="text-rose-500">*</span>
                </label>
                {password.length > 0 && (
                  <span className={`text-[11px] font-bold ${strength.text}`}>
                    Strength: {strength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password (min 8 characters)"
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-forest-600 focus:outline-none transition-all"
                  required
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

              {/* Strength Meter Bar */}
              <div className="mt-2 h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: strength.width, backgroundColor: strength.bgHex }}
                />
              </div>

              {/* Password Checklist */}
              <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-forest-950/30 border border-gray-200 dark:border-forest-900/40 text-[11px] space-y-1">
                <span className="font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                  Password Requirements:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <div className={`flex items-center space-x-1.5 ${criteria.length ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400'}`}>
                    {criteria.length ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${criteria.uppercase ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400'}`}>
                    {criteria.uppercase ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>Uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${criteria.lowercase ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400'}`}>
                    {criteria.lowercase ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>Lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${criteria.number ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400'}`}>
                    {criteria.number ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>At least one number (0-9)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${criteria.special ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400'}`}>
                    {criteria.special ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>Special symbol (!@#$...)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                {confirmPassword.length > 0 && (
                  <span className={`text-[11px] font-semibold ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {passwordsMatch ? 'Passwords Match ✓' : 'Passwords Mismatch ✗'}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter administrator password"
                  className={`w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border ${confirmPassword.length > 0 ? (passwordsMatch ? 'border-emerald-500 dark:border-emerald-600' : 'border-rose-400 dark:border-rose-600') : 'border-gray-300 dark:border-forest-800'} bg-white dark:bg-forest-950/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-forest-600 focus:outline-none transition-all`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch || !setupToken.trim()}
              className="w-full mt-6 py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-forest-800 via-forest-900 to-charcoal-900 hover:from-forest-900 hover:to-black shadow-lg shadow-forest-900/30 hover:shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Provisioning Administrator Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-leaf-400" />
                  <span>Create Admin Account</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="mt-8 pt-5 border-t border-gray-100 dark:border-forest-900 text-center flex flex-col sm:flex-row items-center justify-between text-xs space-y-2 sm:space-y-0">
          <Link
            to="/admin/login"
            className="text-gray-600 dark:text-gray-400 hover:text-forest-700 dark:hover:text-leaf-400 font-medium inline-flex items-center space-x-1"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            <span>Already have an account? Admin Login</span>
          </Link>
          <Link
            to="/login"
            className="text-leaf-700 dark:text-leaf-400 hover:underline font-semibold inline-flex items-center space-x-1"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Switch to Farmer Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
