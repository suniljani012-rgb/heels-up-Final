import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { ShieldCheck, Key, Lock, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface AdminAuthProps {
  onAuthSuccess: (user: { name: string; role: string; email: string; permissions?: string[] }) => void;
}

export default function AdminAuth({ onAuthSuccess }: AdminAuthProps) {
  const showToast = useToastStore((state) => state.showToast);

  // Authentication State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  // Password Recovery States
  const [resetStep, setResetStep] = useState<'login' | 'forgot_email' | 'reset_otp'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      showToast('error', 'Fields Required', 'Please enter your registered staff email and password.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.toLowerCase().trim(), password: passwordInput }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.step === 'otp_required') {
          setOtpRequired(true);
          setSessionToken(data.data.session_token);
          if (data.data.warning) {
            showToast('warning', 'OTP Bypassed (Local Dev)', data.data.warning);
          } else {
            showToast('info', '2FA Check', 'A 6-digit passcode has been sent to your email.');
          }
        } else {
          const { token, user: loggedUser } = data.data;
          localStorage.setItem('heelsup_token', token);
          localStorage.setItem('heelsup_user', JSON.stringify(loggedUser));
          onAuthSuccess(loggedUser);
          showToast('success', 'Session Established', `Welcome back, ${loggedUser.name}!`);
        }
      } else {
        showToast('error', 'Authentication Failed', data.error || 'Invalid email or password credentials.');
      }
    } catch (err) {
      showToast('error', 'Network Error', 'Failed to connect to the authentication server.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.length !== 6) {
      showToast('error', 'Invalid Format', 'Please enter the 6-digit passcode.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/admin-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput, session_token: sessionToken }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const { token, user: loggedUser } = data.data;
        localStorage.setItem('heelsup_token', token);
        localStorage.setItem('heelsup_user', JSON.stringify(loggedUser));
        onAuthSuccess(loggedUser);
        setOtpRequired(false);
        setSessionToken(null);
        setOtpInput('');
        showToast('success', 'OTP Verified', `Access granted for ${loggedUser.name}`);
      } else {
        showToast('error', 'OTP Mismatch', data.error || 'The passcode you entered is invalid.');
      }
    } catch {
      showToast('error', 'Verification Failure', 'Could not complete passcode verification.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      showToast('error', 'Email Required', 'Please enter your registered staff email.');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'OTP Sent', 'Password reset code has been sent.');
        setResetStep('reset_otp');
      } else {
        showToast('error', 'Request Denied', data.error || 'Account not found.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Could not trigger forgot password service.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtpCode || !resetNewPassword || !resetConfirmPassword) {
      showToast('error', 'Missing Parameters', 'All password parameters are mandatory.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      showToast('error', 'Mismatch', 'Passwords do not match.');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.toLowerCase().trim(),
          otp: resetOtpCode,
          password: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Credentials Reset', 'Your password has been successfully updated.');
        setResetStep('login');
      } else {
        showToast('error', 'Reset Failure', data.error || 'Invalid passcode.');
      }
    } catch {
      showToast('error', 'Network Error', 'Could not establish connection to reset services.');
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-8 rounded-3xl animate-fade-in text-slate-900 dark:text-white">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          HeelsUp Administration
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Secure identity verification & governance console
        </p>
      </div>

      {resetStep === 'login' && !otpRequired && (
        <form className="mt-7 space-y-4" onSubmit={handleLogin}>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@heelsup.in"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 placeholder-slate-400 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Access Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 placeholder-slate-400 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setResetStep('forgot_email')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
          >
            {loggingIn ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>
      )}

      {otpRequired && (
        <form className="mt-7 space-y-4" onSubmit={handleOtpVerify}>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 text-center">
                Two-Factor Security Code (OTP)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="123456"
                className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono text-center tracking-widest font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
          >
            {loggingIn ? 'Verifying...' : 'Confirm Passcode'}
          </button>
        </form>
      )}

      {resetStep === 'forgot_email' && (
        <form className="mt-7 space-y-4" onSubmit={handleForgotSubmit}>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Registered Staff Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="admin@heelsup.in"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 placeholder-slate-400 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setResetStep('login')}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </button>
          </div>

          <button
            type="submit"
            disabled={resettingPassword}
            className="w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
          >
            {resettingPassword ? 'Sending OTP...' : 'Send Recovery Passcode'}
          </button>
        </form>
      )}

      {resetStep === 'reset_otp' && (
        <form className="mt-7 space-y-4" onSubmit={handleResetSubmit}>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                OTP Passcode
              </label>
              <input
                type="text"
                required
                value={resetOtpCode}
                onChange={(e) => setResetOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-center font-mono tracking-widest font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={resetConfirmPassword}
                onChange={(e) => setResetConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={resettingPassword}
            className="w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
          >
            {resettingPassword ? 'Updating...' : 'Set New Password'}
          </button>
        </form>
      )}
    </div>
  );
}
