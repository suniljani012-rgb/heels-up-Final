import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { ShieldCheck, Key, Lock, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

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
          otp: resetOtpCode.trim(),
          password: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Password Updated', 'You can now authenticate with your new password.');
        setResetStep('login');
        setResetEmail('');
        setResetOtpCode('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      } else {
        showToast('error', 'Reset Failed', data.error || 'Invalid OTP code.');
      }
    } catch {
      showToast('error', 'Connection Failure', 'Could not save new password.');
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 antialiased">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">HeelsUp Enterprise Portal</h1>
          <p className="text-xs text-slate-400">Authenticated staff administration console</p>
        </div>

        {/* Step 1: Login Form / 2FA OTP */}
        {resetStep === 'login' && !otpRequired && (
          <Card className="bg-slate-900 border-slate-800 text-slate-100 p-6 space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-slate-400 mb-1">Corporate Email</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="staff@heelsup.in"
                    className="pl-9 bg-slate-950 border-slate-800 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-slate-400">Master Password</Label>
                  <button
                    type="button"
                    onClick={() => setResetStep('forgot_email')}
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    Forgot passcode?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="pl-9 bg-slate-950 border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loggingIn}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5"
              >
                {loggingIn ? 'Authenticating...' : 'Sign In to Portal'}
              </Button>
            </form>
          </Card>
        )}

        {/* Step 2: 2FA Verification Form */}
        {resetStep === 'login' && otpRequired && (
          <Card className="bg-slate-900 border-slate-800 text-slate-100 p-6 space-y-5">
            <div className="text-center space-y-1 border-b border-slate-800 pb-4">
              <h2 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-400" /> Two-Factor Verification
              </h2>
              <p className="text-xs text-slate-400">
                Enter the 6-digit numeric passcode sent to your identity email
              </p>
            </div>

            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div>
                <Label className="text-slate-400 mb-1 text-center block">Security Passcode (OTP)</Label>
                <Input
                  type="text"
                  maxLength={6}
                  required
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="bg-slate-950 border-slate-800 text-white text-center font-mono text-xl tracking-[0.5em]"
                />
              </div>

              <Button
                type="submit"
                disabled={loggingIn || otpInput.length !== 6}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5"
              >
                {loggingIn ? 'Verifying 2FA...' : 'Confirm Access'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setOtpRequired(false);
                  setSessionToken(null);
                }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-400"
              >
                Cancel and back to login
              </button>
            </form>
          </Card>
        )}

        {/* Step 3: Forgot Password - Request OTP */}
        {resetStep === 'forgot_email' && (
          <Card className="bg-slate-900 border-slate-800 text-slate-100 p-6 space-y-5">
            <div className="text-center space-y-1 border-b border-slate-800 pb-4">
              <h2 className="text-sm font-bold text-white">Reset Account Password</h2>
              <p className="text-xs text-slate-400">
                Receive an email passcode to set a new administrator password
              </p>
            </div>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-400 mb-1">Registered Staff Email</Label>
                <Input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="staff@heelsup.in"
                  className="bg-slate-950 border-slate-800 text-white font-mono text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={resettingPassword}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5"
              >
                {resettingPassword ? 'Sending...' : 'Send Reset Code'}
              </Button>

              <button
                type="button"
                onClick={() => setResetStep('login')}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-400 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            </form>
          </Card>
        )}

        {/* Step 4: Forgot Password - Complete Reset */}
        {resetStep === 'reset_otp' && (
          <Card className="bg-slate-900 border-slate-800 text-slate-100 p-6 space-y-5">
            <div className="text-center space-y-1 border-b border-slate-800 pb-4">
              <h2 className="text-sm font-bold text-white">Enter Reset Code & New Password</h2>
              <p className="text-xs text-slate-400">
                Check inbox at <span className="font-mono text-indigo-400">{resetEmail}</span>
              </p>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-400 mb-1">Reset Passcode (OTP)</Label>
                <Input
                  type="text"
                  maxLength={6}
                  required
                  value={resetOtpCode}
                  onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="bg-slate-950 border-slate-800 text-white font-mono text-xs text-center tracking-widest"
                />
              </div>

              <div>
                <Label className="text-slate-400 mb-1">New Password</Label>
                <Input
                  type="password"
                  required
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>

              <div>
                <Label className="text-slate-400 mb-1">Confirm New Password</Label>
                <Input
                  type="password"
                  required
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={resettingPassword}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5"
              >
                {resettingPassword ? 'Updating Password...' : 'Save New Password & Sign In'}
              </Button>

              <button
                type="button"
                onClick={() => setResetStep('login')}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-400 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            </form>
          </Card>
        )}

        <div className="text-center text-[11px] text-slate-600 font-mono">
          Protected by Enterprise Session Authorization & IP Auditing
        </div>
      </div>
    </div>
  );
}
