import React, { useState } from 'react';
import { useToastStore } from '../../store/useToastStore';
import { Save, Info, Key, Shield, Settings2, Sliders, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

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
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Global System Configurations
          </CardTitle>
          <CardDescription>
            Configure payment gateways, identity authenticators, worker parameters, and security policies
          </CardDescription>
        </div>

        {hasUnsavedChanges && (
          <Badge variant="warning" className="animate-pulse">
            Unsaved Changes Pending
          </Badge>
        )}
      </Card>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Core Credentials & Integrations */}
        <Card className="lg:col-span-2 p-5 space-y-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Payment Gateway & API Credentials
          </CardTitle>

          <div className="space-y-4 text-xs">
            <div>
              <Label className="mb-1">Razorpay Key ID</Label>
              <Input
                type="text"
                value={getValue('razorpay_key_id')}
                onChange={(e) => handleValueChange('razorpay_key_id', e.target.value)}
                placeholder="rzp_live_..."
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="mb-1">Razorpay Key Secret</Label>
              <Input
                type="password"
                value={getValue('razorpay_key_secret')}
                onChange={(e) => handleValueChange('razorpay_key_secret', e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="mb-1">Google OAuth Client ID</Label>
              <Input
                type="text"
                value={getValue('google_client_id')}
                onChange={(e) => handleValueChange('google_client_id', e.target.value)}
                placeholder="...apps.googleusercontent.com"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="mb-1">Google Apps Script Mail Endpoint</Label>
              <Input
                type="text"
                value={getValue('gas_mail_endpoint')}
                onChange={(e) => handleValueChange('gas_mail_endpoint', e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="font-mono text-xs"
              />
            </div>
          </div>
        </Card>

        {/* Store Policies & Controls */}
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Store Policies & Thresholds
            </CardTitle>

            <div className="space-y-3.5 text-xs">
              <div>
                <Label className="mb-1">Free Delivery Min Spend (₹)</Label>
                <Input
                  type="number"
                  value={getValue('free_shipping_threshold')}
                  onChange={(e) => handleValueChange('free_shipping_threshold', e.target.value)}
                  placeholder="999"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label className="mb-1">Flat Standard Shipping Fee (₹)</Label>
                <Input
                  type="number"
                  value={getValue('standard_shipping_fee')}
                  onChange={(e) => handleValueChange('standard_shipping_fee', e.target.value)}
                  placeholder="99"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label className="mb-1">Return Window Period (Days)</Label>
                <Input
                  type="number"
                  value={getValue('return_window_days')}
                  onChange={(e) => handleValueChange('return_window_days', e.target.value)}
                  placeholder="7"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </Card>

          {/* Submit Action Box */}
          <Card className="p-4 space-y-3">
            <Button
              type="submit"
              disabled={saving || !hasUnsavedChanges}
              className="w-full py-2.5 font-bold text-xs"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Synchronizing...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save All Configurations
                </>
              )}
            </Button>
            <p className="text-[10px] text-slate-400 text-center">
              Changes take effect across the storefront instantly.
            </p>
          </Card>
        </div>
      </form>
    </div>
  );
}
