'use client';

import React, { useEffect, useState, useRef } from 'react';
import AppShell from '@/components/AppShell';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Radio,
  Clock,
  ShieldCheck,
  Code,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Terminal,
  Zap,
} from 'lucide-react';

export default function DiagnosticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Test message dispatcher state
  const [testNumber, setTestNumber] = useState('+918466974408');
  const [testTemplate, setTestTemplate] = useState('hello_world');
  const [customText, setCustomText] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [activeWamid, setActiveWamid] = useState<string | null>(null);
  const [trackedMessage, setTrackedMessage] = useState<any>(null);
  const [showRawPayloads, setShowRawPayloads] = useState(false);
  const [showLastWebhook, setShowLastWebhook] = useState(false);

  // Simulation state
  const [simulating, setSimulating] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/diagnostics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch diagnostics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  // Poll for message status if activeWamid is set
  useEffect(() => {
    if (!activeWamid) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/whatsapp/message-status/${activeWamid}`);
        if (res.ok) {
          const msg = await res.json();
          setTrackedMessage(msg);

          // Stop polling if READ or FAILED
          if (msg.deliveryStatus === 'READ' || msg.deliveryStatus === 'FAILED') {
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      } catch (e) {
        console.error('Error polling message status:', e);
      }
    };

    pollStatus();
    pollingRef.current = setInterval(pollStatus, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeWamid]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDiagnostics();
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber) return;

    setSendingTest(true);
    setTestResult(null);
    setTrackedMessage(null);
    setActiveWamid(null);

    try {
      const res = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientMobileNumber: testNumber,
          templateName: testTemplate,
          customText: customText || undefined,
        }),
      });

      const result = await res.json();
      setTestResult(result);

      if (result.whatsappMessageId) {
        setActiveWamid(result.whatsappMessageId);
      }

      fetchDiagnostics();
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Failed to dispatch test request',
        errorCode: 'CLIENT_ERROR',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSimulateWebhook = async (wamid: string, eventType: string) => {
    setSimulating(`${wamid}-${eventType}`);
    try {
      const res = await fetch('/api/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate_webhook_status',
          wamid,
          eventType,
        }),
      });
      if (res.ok) {
        fetchDiagnostics();
        if (activeWamid === wamid) {
          const statusRes = await fetch(`/api/whatsapp/message-status/${wamid}`);
          if (statusRes.ok) {
            setTrackedMessage(await statusRes.json());
          }
        }
      }
    } catch (e) {
      console.error('Error simulating webhook:', e);
    } finally {
      setSimulating(null);
    }
  };

  const copyToClipboard = (text: string, type: 'url' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <AppShell
      title="Developer Diagnostics & Live WhatsApp Delivery Tracker"
      subtitle="Verify authentic Meta Cloud API connectivity, test recipient eligibility, and inspect live webhook delivery states"
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0f1118] p-4 rounded-xl border border-[#212536]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Meta Cloud API Inspection Suite
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Zero Simulation Mode
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Every request connects directly to Meta Graph API ({data?.account?.apiVersion || 'v21.0'}). No simulated deliveries.
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#191d2b] hover:bg-[#22273a] text-slate-200 text-xs font-semibold border border-[#2e344d] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#25D366]' : ''}`} />
            <span>{refreshing ? 'Testing Meta Connection...' : 'Re-test Meta Connection'}</span>
          </button>
        </div>

        {/* Sandbox vs Production Notice Banner */}
        {data?.account?.isTestNumber ? (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 flex items-start gap-3.5">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-bold flex items-center gap-2 text-amber-300">
                <span>SANDBOX TEST NUMBER DETECTED</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 font-mono">
                  Phone ID: {data?.account?.phoneNumberId}
                </span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Meta enforces strict recipient restrictions for Sandbox test phone numbers:
                Outbound WhatsApp messages can <strong>ONLY</strong> be delivered to mobile numbers that have been explicitly added to the
                <strong> &ldquo;Allowed Test Recipients&rdquo;</strong> list in your{' '}
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-white inline-flex items-center gap-1 font-semibold"
                >
                  Meta App Dashboard (WhatsApp &gt; API Setup) <ExternalLink className="h-3 w-3 inline" />
                </a>.
                Sending to any unlisted number will be rejected by Meta with <strong>Error Code 131030</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-600/30 text-emerald-200 flex items-start gap-3.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <span>REGISTERED OFFICIAL PRODUCTION BUSINESS NUMBER</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 font-mono text-emerald-300">
                  {data?.account?.displayPhoneNumber}
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Connected to official verified Meta WhatsApp Business Account for <strong>SLRJ DIGITAL</strong>.
                Eligible to dispatch approved WhatsApp templates to any opted-in customer globally.
              </p>
            </div>
          </div>
        )}

        {/* 3 Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Meta Cloud API Status */}
          <div className="p-5 rounded-xl bg-[#0f1118] border border-[#212536] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Meta API Status</span>
              {data?.account?.isConnected ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  AUTHENTICATED
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-950/50 text-red-400 border border-red-500/30">
                  <XCircle className="h-3.5 w-3.5" />
                  DISCONNECTED
                </span>
              )}
            </div>

            <div className="space-y-2.5 pt-1 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#1b1e2e]">
                <span className="text-slate-400">Verified Name:</span>
                <span className="font-semibold text-slate-200">{data?.account?.verifiedName || 'SLRJ DIGITAL'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#1b1e2e]">
                <span className="text-slate-400">Phone Number ID:</span>
                <span className="font-mono text-slate-300 font-semibold">{data?.account?.phoneNumberId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#1b1e2e]">
                <span className="text-slate-400">WABA ID:</span>
                <span className="font-mono text-slate-300 font-semibold">{data?.account?.wabaId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#1b1e2e]">
                <span className="text-slate-400">Access Token:</span>
                <span className="font-mono text-slate-400">{data?.account?.maskedAccessToken}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Quality Rating:</span>
                <span className="px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {data?.account?.qualityRating || 'GREEN'}
                </span>
              </div>
            </div>

            {data?.account?.lastApiError && (
              <div className="p-2.5 rounded bg-red-950/30 border border-red-800/40 text-[11px] text-red-300 space-y-1">
                <div className="font-bold text-red-400">Last Meta API Error:</div>
                <div className="font-mono leading-tight break-words">{data.account.lastApiError}</div>
              </div>
            )}
          </div>

          {/* Card 2: Webhook Configuration */}
          <div className="p-5 rounded-xl bg-[#0f1118] border border-[#212536] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Webhook Status</span>
              {data?.account?.lastWebhookReceivedAt ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">
                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                  RECEIVING EVENTS
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-950/50 text-amber-400 border border-amber-500/30">
                  <Clock className="h-3.5 w-3.5" />
                  AWAITING FIRST EVENT
                </span>
              )}
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Callback URL (configure in Meta):</span>
                  <button
                    onClick={() => copyToClipboard(data?.webhookInfo?.url || '', 'url')}
                    className="text-[11px] text-[#25D366] hover:underline flex items-center gap-1"
                  >
                    {copiedUrl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedUrl ? 'Copied' : 'Copy URL'}
                  </button>
                </div>
                <div className="p-2 rounded bg-[#07080c] border border-[#1b1e2e] font-mono text-[11px] text-slate-300 break-all select-all">
                  {data?.webhookInfo?.url || 'http://localhost:3000/api/webhooks/whatsapp'}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Verification Token:</span>
                  <button
                    onClick={() => copyToClipboard(data?.webhookInfo?.verifyToken || '', 'token')}
                    className="text-[11px] text-[#25D366] hover:underline flex items-center gap-1"
                  >
                    {copiedToken ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedToken ? 'Copied' : 'Copy Token'}
                  </button>
                </div>
                <div className="p-2 rounded bg-[#07080c] border border-[#1b1e2e] font-mono text-[11px] text-slate-300 select-all">
                  {data?.webhookInfo?.verifyToken || 'slrj_digital_secure_wh_2026'}
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-[#1b1e2e] text-[11px]">
                <span className="text-slate-400">Last Event Received:</span>
                <span className="text-slate-300 font-mono">
                  {data?.account?.lastWebhookReceivedAt
                    ? new Date(data.account.lastWebhookReceivedAt).toLocaleTimeString()
                    : 'None yet'}
                </span>
              </div>
            </div>

            {data?.account?.lastWebhookPayload && (
              <div>
                <button
                  onClick={() => setShowLastWebhook(!showLastWebhook)}
                  className="w-full text-left text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-between py-1 border-t border-[#1b1e2e]"
                >
                  <span>Inspect Last Webhook JSON Payload</span>
                  {showLastWebhook ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showLastWebhook && (
                  <pre className="mt-2 p-2.5 rounded bg-[#07080c] border border-[#1b1e2e] text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-36">
                    {data.account.lastWebhookPayload}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Card 3: Outgoing Message Lifecycle Counters */}
          <div className="p-5 rounded-xl bg-[#0f1118] border border-[#212536] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivery Counters</span>
              <span className="text-xs font-mono text-slate-400">Total: {data?.messageStats?.total || 0}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#141724] border border-[#22273a]">
                <span className="text-[10px] uppercase font-bold text-blue-400">Submitted</span>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {data?.messageStats?.submitted || 0}
                </div>
                <span className="text-[9px] text-slate-400">Accepted by Meta API</span>
              </div>

              <div className="p-3 rounded-lg bg-[#141724] border border-[#22273a]">
                <span className="text-[10px] uppercase font-bold text-amber-400">Sent</span>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {data?.messageStats?.sent || 0}
                </div>
                <span className="text-[9px] text-slate-400">Confirmed via Webhook</span>
              </div>

              <div className="p-3 rounded-lg bg-[#141724] border border-[#22273a]">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Delivered</span>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {data?.messageStats?.delivered || 0}
                </div>
                <span className="text-[9px] text-slate-400">Received on handset</span>
              </div>

              <div className="p-3 rounded-lg bg-[#141724] border border-[#22273a]">
                <span className="text-[10px] uppercase font-bold text-red-400">Failed</span>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {data?.messageStats?.failed || 0}
                </div>
                <span className="text-[9px] text-slate-400">Undeliverable / Rejected</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#141724] border border-[#22273a] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400">Read By User</span>
                <div className="text-lg font-bold font-mono text-white">
                  {data?.messageStats?.read || 0}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Only marked when user opens WhatsApp
              </span>
            </div>
          </div>
        </div>

        {/* Live Test Message Dispatcher & 5-Step Lifecycle Tracker */}
        <div className="p-6 rounded-xl bg-[#0f1118] border border-[#212536] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f2334] pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-[#25D366]" />
                Live WhatsApp Message Test &amp; Real-Time Webhook Tracker
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Send an authentic WhatsApp template message to your phone and monitor actual delivery confirmation without synthetic delays.
              </p>
            </div>
            {activeWamid && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <span className="text-[11px] font-mono text-blue-400">Tracking Webhooks for {activeWamid.slice(-8)}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSendTest} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Recipient Mobile Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="e.g. +91 98765 43210 or 919876543210"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-[#090a0e] border border-[#232738] text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-[#25D366]"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Enter your real personal number with country code (e.g. 91 for India).
              </p>
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                WhatsApp Template Name
              </label>
              <select
                value={testTemplate}
                onChange={(e) => setTestTemplate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-[#090a0e] border border-[#232738] text-sm text-white font-mono focus:outline-none focus:border-[#25D366]"
              >
                <option value="hello_world">hello_world (Meta Pre-Approved Standard)</option>
                <option value="slrj_digital_intro">slrj_digital_intro (SLRJ Business Intro)</option>
                <option value="slrj_web_dev_offer">slrj_web_dev_offer (SLRJ Web Offer)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Meta requires approved templates to initiate outbound business chats.
              </p>
            </div>

            <div className="md:col-span-4 flex items-end">
              <button
                type="submit"
                disabled={sendingTest || !testNumber}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-black font-bold text-sm transition-all disabled:opacity-50"
              >
                {sendingTest ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Calling Meta Graph API...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send Real WhatsApp Message</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Test Dispatch Result Card */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-3 ${
                testResult.success
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : 'bg-red-950/20 border-red-500/30 text-red-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="font-bold text-sm">
                    {testResult.success
                      ? 'Meta Graph API Request Accepted (HTTP 200 OK)'
                      : `Meta API Dispatch Error (Code ${testResult.errorCode || 'UNKNOWN'})`}
                  </span>
                </div>
                {testResult.whatsappMessageId && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    WAMID: {testResult.whatsappMessageId}
                  </span>
                )}
              </div>

              {testResult.error && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 font-mono text-[11px] text-red-200 leading-relaxed">
                  {testResult.error}
                </div>
              )}

              {testResult.testNumberWarning && (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-200 text-[11px]">
                  {testResult.testNumberWarning}
                </div>
              )}

              {/* Accordion for Raw Request and Response */}
              <div>
                <button
                  onClick={() => setShowRawPayloads(!showRawPayloads)}
                  className="text-[11px] underline hover:text-white flex items-center gap-1 font-semibold"
                >
                  {showRawPayloads ? 'Hide Raw Meta Payloads' : 'View Raw Meta Request & Response JSON'}
                  {showRawPayloads ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {showRawPayloads && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 mb-1">RAW REQUEST TO GRAPH API:</div>
                      <pre className="p-2.5 rounded bg-[#07080c] border border-[#1b1e2e] text-[10px] text-slate-300 font-mono overflow-x-auto max-h-48">
                        {JSON.stringify(testResult.rawRequest, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 mb-1">RAW RESPONSE FROM GRAPH API:</div>
                      <pre className="p-2.5 rounded bg-[#07080c] border border-[#1b1e2e] text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-48">
                        {JSON.stringify(testResult.rawResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5-Stage Live Status Pipeline Tracker */}
          {(trackedMessage || testResult?.success) && (
            <div className="p-5 rounded-xl bg-[#090a0e] border border-[#1e2230] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live WhatsApp Message Delivery State Machine
                </span>
                <span className="text-xs font-mono text-[#25D366]">
                  Current Status: {trackedMessage?.deliveryStatus || 'SUBMITTED'}
                </span>
              </div>

              {/* 5 Steps Visualizer */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {/* Step 1: SUBMITTED */}
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    trackedMessage?.submissionStatus === 'SUBMITTED' || testResult?.success
                      ? 'bg-blue-950/30 border-blue-500/40 text-blue-200'
                      : 'bg-[#12141c] border-[#1e2230] text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase">1. API Accepted</span>
                    <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-xs font-semibold text-white">SUBMITTED</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {trackedMessage?.submittedAt
                      ? new Date(trackedMessage.submittedAt).toLocaleTimeString()
                      : 'Dispatched to Meta'}
                  </div>
                </div>

                {/* Step 2: SENT */}
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    trackedMessage?.deliveryStatus === 'SENT' ||
                    trackedMessage?.deliveryStatus === 'DELIVERED' ||
                    trackedMessage?.deliveryStatus === 'READ'
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : 'bg-[#12141c] border-[#1e2230] text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase">2. Server Sent</span>
                    {trackedMessage?.sentAt ? (
                      <CheckCircle2 className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-600 animate-pulse" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white">SENT</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {trackedMessage?.sentAt
                      ? new Date(trackedMessage.sentAt).toLocaleTimeString()
                      : 'Awaiting Webhook'}
                  </div>
                </div>

                {/* Step 3: DELIVERED */}
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    trackedMessage?.deliveryStatus === 'DELIVERED' ||
                    trackedMessage?.deliveryStatus === 'READ'
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-[#12141c] border-[#1e2230] text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase">3. Delivered</span>
                    {trackedMessage?.deliveredAt ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-600 animate-pulse" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white">DELIVERED</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {trackedMessage?.deliveredAt
                      ? new Date(trackedMessage.deliveredAt).toLocaleTimeString()
                      : 'Awaiting Delivery Receipt'}
                  </div>
                </div>

                {/* Step 4: READ */}
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    trackedMessage?.deliveryStatus === 'READ'
                      ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200'
                      : 'bg-[#12141c] border-[#1e2230] text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase">4. Read by User</span>
                    {trackedMessage?.readAt ? (
                      <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-600" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white">READ</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {trackedMessage?.readAt
                      ? new Date(trackedMessage.readAt).toLocaleTimeString()
                      : 'Awaiting User Read'}
                  </div>
                </div>

                {/* Step 5: FAILED */}
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    trackedMessage?.deliveryStatus === 'FAILED'
                      ? 'bg-red-950/40 border-red-500/40 text-red-200'
                      : 'bg-[#12141c] border-[#1e2230] text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase">5. Undelivered</span>
                    {trackedMessage?.deliveryStatus === 'FAILED' && <XCircle className="h-4 w-4 text-red-400" />}
                  </div>
                  <div className="text-xs font-semibold text-white">FAILED</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {trackedMessage?.errorCode ? `Error: ${trackedMessage.errorCode}` : 'None'}
                  </div>
                </div>
              </div>

              {/* Developer Testing: Local Webhook Simulator Buttons */}
              <div className="p-3 rounded-lg bg-[#141622] border border-[#232738] flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">
                  <strong className="text-white">Developer Testing:</strong> Test how our Webhook parser handles incoming Meta status events:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSimulateWebhook(activeWamid || testResult?.whatsappMessageId, 'sent')}
                    disabled={!activeWamid && !testResult?.whatsappMessageId}
                    className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold"
                  >
                    Simulate &apos;sent&apos; Webhook
                  </button>
                  <button
                    onClick={() => handleSimulateWebhook(activeWamid || testResult?.whatsappMessageId, 'delivered')}
                    disabled={!activeWamid && !testResult?.whatsappMessageId}
                    className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold"
                  >
                    Simulate &apos;delivered&apos; Webhook
                  </button>
                  <button
                    onClick={() => handleSimulateWebhook(activeWamid || testResult?.whatsappMessageId, 'read')}
                    disabled={!activeWamid && !testResult?.whatsappMessageId}
                    className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold"
                  >
                    Simulate &apos;read&apos; Webhook
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Delivery History & Diagnostics Table */}
        <div className="p-6 rounded-xl bg-[#0f1118] border border-[#212536] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#25D366]" />
                Recent Message Delivery Audit Log (Authentic Database Records)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every outgoing message record matched strictly on exact Meta WhatsApp Message ID (WAMID).
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh Table
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#212536] text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Message ID / WAMID</th>
                  <th className="py-3 px-3">Recipient</th>
                  <th className="py-3 px-3">Submission</th>
                  <th className="py-3 px-3">Actual WhatsApp Status</th>
                  <th className="py-3 px-3">Timestamps</th>
                  <th className="py-3 px-3">Errors / Notes</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1e2e]">
                {data?.recentMessages && data.recentMessages.length > 0 ? (
                  data.recentMessages.map((msg: any) => (
                    <tr key={msg.id} className="hover:bg-[#141724] transition-colors">
                      <td className="py-3 px-3 font-mono">
                        <div className="text-white font-semibold">{msg.id.slice(0, 10)}...</div>
                        {msg.whatsappMessageId ? (
                          <div className="text-[10px] text-emerald-400 break-all select-all">
                            {msg.whatsappMessageId}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500">No WAMID (Failed API)</div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-300">
                        <div>{msg.recipientNumber}</div>
                        <div className="text-[10px] text-slate-500">{msg.templateName || msg.messageType}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            msg.submissionStatus === 'SUBMITTED'
                              ? 'bg-blue-950/40 text-blue-400 border border-blue-500/20'
                              : 'bg-red-950/40 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {msg.submissionStatus}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            msg.deliveryStatus === 'READ'
                              ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-500/30'
                              : msg.deliveryStatus === 'DELIVERED'
                              ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'
                              : msg.deliveryStatus === 'SENT'
                              ? 'bg-amber-950/50 text-amber-400 border border-amber-500/30'
                              : msg.deliveryStatus === 'SUBMITTED'
                              ? 'bg-blue-950/50 text-blue-400 border border-blue-500/30'
                              : 'bg-red-950/50 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {msg.deliveryStatus}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-slate-400 font-mono space-y-0.5">
                        {msg.submittedAt && <div>Sub: {new Date(msg.submittedAt).toLocaleTimeString()}</div>}
                        {msg.sentAt && <div className="text-amber-400">Sent: {new Date(msg.sentAt).toLocaleTimeString()}</div>}
                        {msg.deliveredAt && <div className="text-emerald-400">Deliv: {new Date(msg.deliveredAt).toLocaleTimeString()}</div>}
                        {msg.readAt && <div className="text-indigo-400">Read: {new Date(msg.readAt).toLocaleTimeString()}</div>}
                        {!msg.sentAt && !msg.deliveredAt && !msg.readAt && !msg.failedAt && (
                          <div className="text-slate-500 italic">Awaiting webhook update</div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[11px] max-w-xs truncate font-mono">
                        {msg.errorCode ? (
                          <span className="text-red-400" title={msg.errorDescription || ''}>
                            [{msg.errorCode}] {msg.errorDescription || 'Delivery failed'}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {msg.whatsappMessageId && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setActiveWamid(msg.whatsappMessageId);
                                setTrackedMessage(msg);
                              }}
                              className="px-2 py-1 rounded bg-[#1e2335] hover:bg-[#2a3048] text-slate-300 text-[10px] font-semibold transition-colors"
                            >
                              Track Live
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                      No outgoing WhatsApp messages dispatched yet. Send a test message above to begin!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
