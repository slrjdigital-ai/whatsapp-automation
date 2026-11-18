'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import {
  Settings,
  ShieldCheck,
  Key,
  Smartphone,
  Globe,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState<any>({
    accountName: 'SLRJ DIGITAL Official WABA',
    wabaId: '',
    phoneNumberId: '',
    displayPhoneNumber: '+91 84669 74408',
    verifiedName: 'SLRJ DIGITAL',
    qualityRating: 'GREEN',
    messagingLimitTier: 'TIER_1K',
    webhookVerifyToken: 'slrj_digital_secure_wh_2026',
    apiVersion: 'v21.0',
    isConnected: true,
    isDemoMode: true,
    maskedAccessToken: '',
  });

  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/whatsapp`
    : 'https://slrjdigital.in/api/webhooks/whatsapp';

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || {});
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          accessToken: accessToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration');

      setSaveSuccess(true);
      setAccessToken('');
      fetchConfig();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/whatsapp/test-connection', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ connected: false, error: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell
      title="Official WhatsApp Business Cloud API Settings"
      subtitle="Connect our registered Meta WhatsApp Business Account (WABA) and configure secure webhooks"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column (Left 8 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-8 space-y-6">
          {/* Card 1: Connection Mode Switcher */}
          <div className="p-6 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#25D366]" />
                <span>Operating Mode</span>
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                  config.isDemoMode
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {config.isDemoMode ? 'Interactive Demo Simulator' : 'Live Meta Cloud API'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfig({ ...config, isDemoMode: true })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  config.isDemoMode
                    ? 'bg-amber-950/20 border-amber-500/60 text-white shadow-sm'
                    : 'bg-[#181a24] border-[#2b3044] text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs mb-1 text-amber-300">Demo Simulator Mode</div>
                <div className="text-[11px] text-slate-400">
                  Safely test bulk outreach, queue throttles, delivery and read simulations without Meta charges.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, isDemoMode: false })}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  !config.isDemoMode
                    ? 'bg-emerald-950/20 border-emerald-500/60 text-white shadow-sm'
                    : 'bg-[#181a24] border-[#2b3044] text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs mb-1 text-emerald-400">Live Meta Cloud API</div>
                <div className="text-[11px] text-slate-400">
                  Directly dispatch approved templates to real phone numbers via official Facebook Graph API endpoints.
                </div>
              </button>
            </div>
          </div>

          {/* Card 2: Meta Cloud API Credentials */}
          <div className="p-6 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-purple-400" />
              <span>Meta Graph API Credentials</span>
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp Business Account ID (WABA ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={config.wabaId}
                    onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                    placeholder="e.g. 108472918471928"
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={config.phoneNumberId}
                    onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                    placeholder="e.g. 109847291847192"
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Permanent / System-User Access Token
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={config.maskedAccessToken || 'Paste EAAG... permanent token from Meta Business Manager'}
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366] font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {config.hasAccessToken ? 'Token currently stored securely on backend.' : 'No token currently configured.'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Display Phone Number
                  </label>
                  <input
                    type="text"
                    value={config.displayPhoneNumber}
                    onChange={(e) => setConfig({ ...config, displayPhoneNumber: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Verified Brand Display Name
                  </label>
                  <input
                    type="text"
                    value={config.verifiedName}
                    onChange={(e) => setConfig({ ...config, verifiedName: e.target.value })}
                    placeholder="SLRJ DIGITAL"
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Webhook Verification Details */}
          <div className="p-6 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              <span>Official Webhook Endpoint & Signature</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Callback URL (Configure in Meta App Dashboard)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-slate-300 font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={copyWebhookUrl}
                    className="px-3 py-2 rounded-lg bg-[#202332] hover:bg-[#2b3044] border border-[#30364c] text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Webhook Verify Token (Secret Phrase)
                </label>
                <input
                  type="text"
                  value={config.webhookVerifyToken}
                  onChange={(e) => setConfig({ ...config, webhookVerifyToken: e.target.value })}
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Meta App Secret (for X-Hub-Signature-256 HMAC Validation)
                </label>
                <input
                  type="password"
                  value={config.appSecret || ''}
                  onChange={(e) => setConfig({ ...config, appSecret: e.target.value })}
                  placeholder={config.hasAppSecret ? '•••••••••••••••• (Configured)' : 'Paste App Secret from Meta App Dashboard > Basic Settings'}
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366] font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Used by our webhook endpoint to cryptographically verify that status callbacks originate from Meta.
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                <span>Configuration saved successfully!</span>
              </span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba5a] hover:to-[#0f7569] text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </form>

        {/* Verification Status Card (Right 4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Meta API Verification Status
            </h3>

            <div className="p-4 rounded-xl bg-[#161822] border border-[#252a3b] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Connection State:</span>
                <span className="font-bold text-emerald-400">
                  {config.isDemoMode ? 'Demo Simulator Connected' : 'Meta API Verified'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Quality Rating:</span>
                <span className="font-bold text-emerald-400">{config.qualityRating || 'GREEN'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Messaging Tier:</span>
                <span className="font-mono text-slate-200">{config.messagingLimitTier || 'TIER_1K (1,000 / 24h)'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Phone Number:</span>
                <span className="font-mono text-slate-200">{config.displayPhoneNumber}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full py-2.5 rounded-xl bg-[#191d2a] hover:bg-[#222738] border border-[#2c3349] text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-colors"
            >
              {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 text-[#25D366]" />}
              <span>{testing ? 'Testing API Handshake...' : 'Run Live Connection Test'}</span>
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs space-y-1 ${
                  testResult.connected
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-950/40 text-red-300 border border-red-500/30'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {testResult.connected ? '✓ API Handshake Succeeded' : '✕ Handshake Failed'}
                </div>
                {testResult.error && <div>{testResult.error}</div>}
                {testResult.verifiedName && <div>Verified Name: {testResult.verifiedName}</div>}
              </div>
            )}
          </div>

          {/* Developer Diagnostics Link Card */}
          <div className="p-4 rounded-2xl bg-[#0f1118] border border-[#232738] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Deep Debugging</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">Real-Time</span>
            </div>
            <p className="text-xs text-slate-400">
              Inspect raw Meta API responses, live webhook reception logs, test recipient restrictions, and individual message delivery states.
            </p>
            <a
              href="/diagnostics"
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold text-blue-300 flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Developer Diagnostics &amp; Delivery Tracker</span>
            </a>
          </div>

          {/* Quick Guide Card */}
          <div className="p-5 rounded-2xl bg-[#0f1118] border border-[#1f2434] space-y-2 text-xs text-slate-400">
            <span className="font-bold text-slate-200 block">Setup Instructions:</span>
            <p>1. Go to <strong>developers.facebook.com</strong> and open your WhatsApp Business app.</p>
            <p>2. Copy your <strong>Phone Number ID</strong> and <strong>WABA ID</strong> from the API Setup panel.</p>
            <p>3. Generate a <strong>System User permanent token</strong> in Meta Business Manager with permissions: <code>whatsapp_business_messaging</code> and <code>whatsapp_business_management</code>.</p>
            <p>4. In Meta Webhooks, paste the Callback URL and Verify Token above, and subscribe to the <code>messages</code> field.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
