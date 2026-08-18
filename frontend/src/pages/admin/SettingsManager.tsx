import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Save, Info, Key, Shield, Settings2, Sliders, CheckCircle2 } from 'lucide-react';

interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
}

interface SettingsManagerProps {
  settings: Setting[];
  token: string;
  onRefresh: () => void;
}

export default function SettingsManager({ settings, token, onRefresh }: SettingsManagerProps) {
  const showToast = useToastStore((state) => state.showToast);
  // Local settings key-value map before saving
  const [localValues, setLocalValues] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);

  // Initialize state values from props
  const getValue = (key: string) => {
    if (localValues[key] !== undefined) return localValues[key];
    const found = settings.find((s) => s.key === key);
    return found ? found.value : '';
  };

  const handleValueChange = (key: string, val: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: val }));
  };

  // Submit all changes
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(localValues),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save settings');
      }

      showToast('success', 'Settings Saved', 'System configurations updated in database.');
      setLocalValues({});
      onRefresh();
    } catch (err: any) {
      showToast('error', 'Sync Failure', err.message || 'Failed to update settings parameters.');
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = Object.keys(localValues).length > 0;

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Global System Configurations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure payment gateways, identity authenticators, worker parameters, and security policies
          </p>
        </div>

        {hasUnsavedChanges && (
          <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold animate-pulse">
            Unsaved Changes Pending
          </span>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Core Credentials & Integrations */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Payment Gateway & API Credentials
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                Razorpay Key ID
              </label>
              <input
                type="text"
                value={getValue('razorpay_key_id')}
                onChange={(e) => handleValueChange('razorpay_key_id', e.target.value)}
                placeholder="rzp_live_..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                Razorpay Key Secret
              </label>
              <input
                type="password"
                value={getValue('razorpay_key_secret')}
                onChange={(e) => handleValueChange('razorpay_key_secret', e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                Google OAuth Client ID
              </label>
              <input
                type="text"
                value={getValue('google_client_id')}
                onChange={(e) => handleValueChange('google_client_id', e.target.value)}
                placeholder="...apps.googleusercontent.com"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                Google Apps Script Mail Endpoint
              </label>
              <input
                type="text"
                value={getValue('google_appscript_endpoint')}
                onChange={(e) => handleValueChange('google_appscript_endpoint', e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Security & Flow Settings */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Security & Session Policies
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Require Email OTP Verification
                </label>
                <select
                  value={getValue('require_email_otp')}
                  onChange={(e) => handleValueChange('require_email_otp', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="true">Active (Require OTP at registration)</option>
                  <option value="false">Disabled (Allow instant registration)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  JWT Session Expiry (Days)
                </label>
                <input
                  type="number"
                  value={getValue('jwt_expires_days')}
                  onChange={(e) => handleValueChange('jwt_expires_days', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  OTP Token Lifetime (Minutes)
                </label>
                <input
                  type="number"
                  value={getValue('otp_expiry_minutes')}
                  onChange={(e) => handleValueChange('otp_expiry_minutes', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl flex items-start gap-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed shadow-xs">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p>
              Parameters modified here take effect instantly across all server workers. Double check API bindings to prevent checkout and payment errors.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !hasUnsavedChanges}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Syncing Settings...' : 'Save Configurations'}
          </button>
        </div>
      </form>
    </div>
  );
}
