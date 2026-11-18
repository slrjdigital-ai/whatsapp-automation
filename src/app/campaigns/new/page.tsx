'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import WhatsAppPreview from '@/components/WhatsAppPreview';
import {
  Send,
  Users,
  FileCode2,
  Calendar,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
  Smartphone,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export default function NewCampaignPage() {
  const router = useRouter();

  // Campaign Form State
  const [name, setName] = useState('SLRJ Digital - Digital Solutions Outreach');
  const [description, setDescription] = useState('Promotional WhatsApp outreach to verified opted-in business prospects');
  const [campaignType, setCampaignType] = useState<'TEMPLATE' | 'CUSTOM_SESSION'>('TEMPLATE');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);

  // Custom text fallback or custom session
  const [customBody, setCustomBody] = useState('');

  // Audience Target Selection
  const [targetType, setTargetType] = useState<'ALL_OPTED_IN' | 'GROUP'>('ALL_OPTED_IN');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Dynamic Audience Diagnostics (Requirement 4)
  const [audienceBreakdown, setAudienceBreakdown] = useState<{
    totalContacts: number;
    eligibleOptedIn: number;
    missingConsent: number;
    optedOut: number;
    invalidContacts: number;
  }>({
    totalContacts: 0,
    eligibleOptedIn: 0,
    missingConsent: 0,
    optedOut: 0,
    invalidContacts: 0,
  });
  const [loadingAudience, setLoadingAudience] = useState(false);

  // Scheduling
  const [scheduleMode, setScheduleMode] = useState<'NOW' | 'LATER'>('NOW');
  const [scheduledDate, setScheduledDate] = useState('');

  // Test Message
  const [testMobileNumber, setTestMobileNumber] = useState('+918466974408');
  const [testStatus, setTestStatus] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testWamid, setTestWamid] = useState<string | null>(null);
  const [testTrackedMsg, setTestTrackedMsg] = useState<any>(null);
  const testPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!testWamid) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/whatsapp/message-status/${testWamid}`);
        if (res.ok) {
          const data = await res.json();
          setTestTrackedMsg(data);
          if (data.deliveryStatus === 'READ' || data.deliveryStatus === 'FAILED') {
            if (testPollRef.current) clearInterval(testPollRef.current);
          }
        }
      } catch (e) {
        console.error('Error polling test status:', e);
      }
    };

    poll();
    testPollRef.current = setInterval(poll, 2500);
    return () => {
      if (testPollRef.current) clearInterval(testPollRef.current);
    };
  }, [testWamid]);

  // Launch state
  const [submitting, setSubmitting] = useState(false);
  const [errorDetails, setErrorDetails] = useState<any>(null);

  // 1. Load Templates and Groups on initial mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [tplRes, grpRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/groups'),
        ]);

        if (tplRes.ok) {
          const tplData = await tplRes.json();
          setTemplates(tplData.templates || []);
          if (tplData.templates && tplData.templates.length > 0) {
            setSelectedTemplateId(tplData.templates[0].id);
            setCurrentTemplate(tplData.templates[0]);
            setCustomBody(tplData.templates[0].bodyText);
          }
        }

        if (grpRes.ok) {
          const grpData = await grpRes.json();
          setGroups(grpData.groups || []);
          if (grpData.groups && grpData.groups.length > 0) {
            setSelectedGroupId(grpData.groups[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load initial campaign data:', err);
      }
    }

    loadInitialData();
  }, []);

  // 2. Dynamically fetch Audience Breakdown whenever Target changes
  const fetchAudienceBreakdown = async () => {
    setLoadingAudience(true);
    try {
      const query = new URLSearchParams({
        targetType,
        ...(targetType === 'GROUP' && selectedGroupId ? { targetGroupId: selectedGroupId } : {}),
      });

      const res = await fetch(`/api/campaigns/audience-preview?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.audience) {
          setAudienceBreakdown(data.audience);
        }
      }
    } catch (e) {
      console.error('Error previewing audience breakdown:', e);
    } finally {
      setLoadingAudience(false);
    }
  };

  useEffect(() => {
    fetchAudienceBreakdown();
  }, [targetType, selectedGroupId]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const found = templates.find((t) => t.id === templateId);
    if (found) {
      setCurrentTemplate(found);
      setCustomBody(found.bodyText);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testMobileNumber) return;
    setTesting(true);
    setTestStatus(null);
    setTestWamid(null);
    setTestTrackedMsg(null);

    try {
      const res = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientMobileNumber: testMobileNumber,
          templateName: currentTemplate?.name || 'hello_world',
          customText: customBody,
        }),
      });

      const data = await res.json();
      setTestStatus(data);
      if (data.whatsappMessageId) {
        setTestWamid(data.whatsappMessageId);
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        error: err.message || 'Failed to dispatch test message',
        errorCode: 'NETWORK_ERROR',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCreateAndLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorDetails(null);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          type: campaignType,
          templateId: campaignType === 'TEMPLATE' ? selectedTemplateId : null,
          customBody,
          targetType,
          targetGroupId: targetType === 'GROUP' ? selectedGroupId : null,
          scheduledAt: scheduleMode === 'LATER' && scheduledDate ? new Date(scheduledDate).toISOString() : null,
          startImmediately: scheduleMode === 'NOW',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorDetails(data);
        setSubmitting(false);
        return;
      }

      // Redirect to the campaign details & live analytics page
      router.push(`/campaigns/${data.campaign.id}`);
    } catch (err: any) {
      setErrorDetails({ error: err.message || 'Error creating campaign' });
      setSubmitting(false);
    }
  };

  const templateButtons = currentTemplate?.buttonsJson
    ? JSON.parse(currentTemplate.buttonsJson)
    : [];

  return (
    <AppShell
      title="Create Outreach Campaign"
      subtitle="Craft personalized WhatsApp campaigns with verified Meta approved templates and strict opt-in filtering"
    >
      {/* Detailed Diagnostic Error Banner if Zero Eligible Contacts */}
      {errorDetails && (
        <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-red-300">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span>{errorDetails.error}</span>
          </div>

          {errorDetails.explanation && (
            <p className="text-xs text-slate-300 leading-relaxed">
              {errorDetails.explanation}
            </p>
          )}

          {errorDetails.breakdown && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2 rounded bg-red-900/30 border border-red-500/20">
                <span className="text-slate-400 block">Total Evaluated:</span>
                <strong className="text-white font-mono">{errorDetails.breakdown.totalEvaluated}</strong>
              </div>
              <div className="p-2 rounded bg-red-900/30 border border-red-500/20">
                <span className="text-slate-400 block">Pending Consent:</span>
                <strong className="text-amber-400 font-mono">{errorDetails.breakdown.missingConsentCount}</strong>
              </div>
              <div className="p-2 rounded bg-red-900/30 border border-red-500/20">
                <span className="text-slate-400 block">Opted Out (STOP):</span>
                <strong className="text-red-400 font-mono">{errorDetails.breakdown.optedOutCount}</strong>
              </div>
              <div className="p-2 rounded bg-red-900/30 border border-red-500/20">
                <span className="text-slate-400 block">Eligible to Send:</span>
                <strong className="text-emerald-400 font-mono">{errorDetails.breakdown.eligibleOptedIn}</strong>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2 text-xs">
            <Link
              href="/consent"
              target="_blank"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
            >
              <span>Open Customer Opt-In Registration Form</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/upload"
              className="px-3.5 py-1.5 rounded-lg bg-[#202534] hover:bg-[#2b3246] text-slate-200 font-semibold"
            >
              Upload Verified Contacts (.xlsx / .csv)
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column (Left 7 cols) */}
        <form onSubmit={handleCreateAndLaunch} className="lg:col-span-7 space-y-6">
          {/* Card 1: Campaign Identity */}
          <div className="p-6 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#25D366]" />
              <span>Campaign Information</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SLRJ Digital - E-Commerce Growth Q1"
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Outreach Objective
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Introducing our web design and branding portfolio to retail store owners"
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Audience Selection & Live Breakdown (Requirement 4) */}
          <div className="p-6 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span>Target Audience & Verified Opt-In Breakdown</span>
              </h3>
              <button
                type="button"
                onClick={fetchAudienceBreakdown}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                title="Refresh audience counts"
              >
                <RefreshCw className={`h-3 w-3 ${loadingAudience ? 'animate-spin text-[#25D366]' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetType('ALL_OPTED_IN')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    targetType === 'ALL_OPTED_IN'
                      ? 'bg-emerald-950/30 border-emerald-500/60 text-white shadow-sm'
                      : 'bg-[#181a24] border-[#2b3044] text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-xs mb-1">All Uploaded Contacts</div>
                  <div className="text-[11px] text-slate-400">
                    Filter entire database for verified opt-in
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('GROUP')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    targetType === 'GROUP'
                      ? 'bg-emerald-950/30 border-emerald-500/60 text-white shadow-sm'
                      : 'bg-[#181a24] border-[#2b3044] text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-xs mb-1">By Contact Group</div>
                  <div className="text-[11px] text-slate-400">
                    Filter by specific uploaded batch
                  </div>
                </button>
              </div>

              {targetType === 'GROUP' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Contact Group:
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g._count?.members || 0} members)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Requirement 4: Five-Metric Live Audience Diagnostic Display */}
              <div className="p-4 rounded-xl bg-[#141722] border border-[#232738] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Selected Audience Eligibility Breakdown:</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {audienceBreakdown.totalContacts} Total Contacts
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                  {/* 1. Eligible Opted-In */}
                  <div className="p-2.5 rounded-lg bg-[#0e1c15] border border-emerald-500/30">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-0.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{audienceBreakdown.eligibleOptedIn} Eligible</span>
                    </div>
                    <span className="text-[10px] text-emerald-300/80 font-sans block">Verified Opted-In</span>
                  </div>

                  {/* 2. Missing Consent / Pending */}
                  <div className="p-2.5 rounded-lg bg-[#1f1b14] border border-amber-500/30">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{audienceBreakdown.missingConsent} Excluded</span>
                    </div>
                    <span className="text-[10px] text-amber-300/80 font-sans block">Pending Consent</span>
                  </div>

                  {/* 3. Opted Out / STOP */}
                  <div className="p-2.5 rounded-lg bg-[#201414] border border-red-500/30">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold mb-0.5">
                      <XCircle className="h-3.5 w-3.5" />
                      <span>{audienceBreakdown.optedOut} Excluded</span>
                    </div>
                    <span className="text-[10px] text-red-300/80 font-sans block">Opted Out (STOP)</span>
                  </div>

                  {/* 4. Invalid */}
                  <div className="p-2.5 rounded-lg bg-[#181a24] border border-[#2a2f42]">
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-0.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                      <span>{audienceBreakdown.invalidContacts} Excluded</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block">Invalid Format</span>
                  </div>
                </div>

                {/* Explanation when no eligible contacts are available */}
                {audienceBreakdown.eligibleOptedIn === 0 && (
                  <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-amber-300">
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                      <span>No Eligible Contacts in Selected Audience</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Promotional campaigns cannot be launched because none of the contacts in this audience have confirmed <strong>OPTED_IN</strong> marketing consent.
                      WhatsApp policies strictly prohibit cold outbound marketing templates to numbers without affirmative consent.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Link
                        href="/consent"
                        target="_blank"
                        className="text-[11px] text-[#25D366] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Customer Voluntary Opt-In Portal</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: WhatsApp Template Selection */}
          <div className="p-6 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-purple-400" />
                <span>Message Content & Official Template</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30 font-semibold">
                Meta Pre-Approved
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Approved Meta Template:
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.displayName} ({tpl.category}) - APPROVED
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Editable Message Body (Variables: {'{{name}}'}, {'{{business_name}}'}):
                </label>
                <textarea
                  rows={8}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg p-3 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[#25D366]"
                />
              </div>

              {currentTemplate?.footerText && (
                <div className="text-[11px] text-slate-400 font-mono">
                  Footer: <em>{currentTemplate.footerText}</em>
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Send Options & Schedule */}
          <div className="p-6 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>Dispatch Timing</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScheduleMode('NOW')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scheduleMode === 'NOW'
                    ? 'bg-amber-950/30 border-amber-500/60 text-white shadow-sm'
                    : 'bg-[#181a24] border-[#2b3044] text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs mb-1">Start Immediately</div>
                <div className="text-[11px] text-slate-400">
                  Process eligible queue right now
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScheduleMode('LATER')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scheduleMode === 'LATER'
                    ? 'bg-amber-950/30 border-amber-500/60 text-white shadow-sm'
                    : 'bg-[#181a24] border-[#2b3044] text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs mb-1">Schedule for Later</div>
                <div className="text-[11px] text-slate-400">
                  Automate send at specific date/time
                </div>
              </button>
            </div>

            {scheduleMode === 'LATER' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Date & Time:
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                />
              </div>
            )}
          </div>

          {/* Test Sender & Launch Controls */}
          <div className="p-6 rounded-2xl bg-[#141722] border border-[#232738] space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Send Test WhatsApp Message (Authentic Meta Dispatch):
                </label>
                <Link
                  href="/diagnostics"
                  target="_blank"
                  className="text-[11px] text-[#25D366] hover:underline flex items-center gap-1 font-mono"
                >
                  Developer Diagnostics <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={testMobileNumber}
                  onChange={(e) => setTestMobileNumber(e.target.value)}
                  placeholder="e.g. +919876543210"
                  className="flex-1 bg-[#1a1e2b] border border-[#2d3348] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#25D366]"
                />
                <button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={testing || !testMobileNumber}
                  className="px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-black text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Test WhatsApp</span>
                    </>
                  )}
                </button>
              </div>

              {/* Real Test Result & Live 4-Stage Status Tracker */}
              {testStatus && (
                <div
                  className={`mt-3 p-3.5 rounded-xl border text-xs space-y-2.5 ${
                    testStatus.success
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : 'bg-red-950/20 border-red-500/30 text-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {testStatus.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span className="font-bold">
                        {testStatus.success
                          ? 'API Request Accepted by Meta (HTTP 200)'
                          : `Meta Cloud API Error (${testStatus.errorCode || 'FAILED'})`}
                      </span>
                    </div>
                    {testStatus.whatsappMessageId && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                        {testStatus.whatsappMessageId.slice(0, 18)}...
                      </span>
                    )}
                  </div>

                  {testStatus.error && (
                    <div className="p-2.5 rounded bg-red-950/40 border border-red-800/40 font-mono text-[11px] leading-relaxed text-red-300">
                      {testStatus.error}
                    </div>
                  )}

                  {testStatus.testNumberWarning && (
                    <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-amber-200 text-[11px]">
                      {testStatus.testNumberWarning}
                    </div>
                  )}

                  {/* 4-Stage Indicator */}
                  {testStatus.success && (
                    <div className="pt-2 border-t border-emerald-500/20 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                        <span>Live Delivery Lifecycle:</span>
                        <span className="font-mono text-[#25D366]">
                          {testTrackedMsg?.deliveryStatus || 'SUBMITTED (Awaiting Webhook)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                        <div
                          className={`p-1.5 rounded border ${
                            testTrackedMsg?.submissionStatus === 'SUBMITTED' || testStatus.success
                              ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                              : 'bg-[#12141c] border-[#1e2230] text-slate-600'
                          }`}
                        >
                          <div>1. Accepted</div>
                          <div className="text-[9px] text-slate-400">SUBMITTED</div>
                        </div>

                        <div
                          className={`p-1.5 rounded border ${
                            testTrackedMsg?.deliveryStatus === 'SENT' ||
                            testTrackedMsg?.deliveryStatus === 'DELIVERED' ||
                            testTrackedMsg?.deliveryStatus === 'READ'
                              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                              : 'bg-[#12141c] border-[#1e2230] text-slate-500'
                          }`}
                        >
                          <div>2. Server</div>
                          <div className="text-[9px] text-slate-400">
                            {testTrackedMsg?.sentAt ? 'SENT' : 'Waiting...'}
                          </div>
                        </div>

                        <div
                          className={`p-1.5 rounded border ${
                            testTrackedMsg?.deliveryStatus === 'DELIVERED' ||
                            testTrackedMsg?.deliveryStatus === 'READ'
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                              : 'bg-[#12141c] border-[#1e2230] text-slate-500'
                          }`}
                        >
                          <div>3. Handset</div>
                          <div className="text-[9px] text-slate-400">
                            {testTrackedMsg?.deliveredAt ? 'DELIVERED' : 'Waiting...'}
                          </div>
                        </div>

                        <div
                          className={`p-1.5 rounded border ${
                            testTrackedMsg?.deliveryStatus === 'READ'
                              ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
                              : 'bg-[#12141c] border-[#1e2230] text-slate-500'
                          }`}
                        >
                          <div>4. Recipient</div>
                          <div className="text-[9px] text-slate-400">
                            {testTrackedMsg?.readAt ? 'READ' : 'Waiting...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || audienceBreakdown.eligibleOptedIn === 0}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba5a] hover:to-[#0f7569] text-white font-bold text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>
                {submitting
                  ? 'Initializing Campaign Engine...'
                  : audienceBreakdown.eligibleOptedIn === 0
                  ? 'No Eligible Opted-In Contacts (Ineligible)'
                  : scheduleMode === 'NOW'
                  ? `Launch Campaign (${audienceBreakdown.eligibleOptedIn} Eligible Recipients)`
                  : 'Schedule Campaign'}
              </span>
            </button>
          </div>
        </form>

        {/* Live Smartphone Preview Column (Right 5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-[#25D366]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Live WhatsApp Mockup Preview
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Auto-rendered
            </span>
          </div>

          <div className="flex justify-center">
            <WhatsAppPreview
              headerType={currentTemplate?.headerType || 'TEXT'}
              headerContent={currentTemplate?.headerContent || 'Greetings from SLRJ DIGITAL!'}
              bodyText={customBody}
              footerText={currentTemplate?.footerText}
              buttons={templateButtons}
              sampleName="Vikram Malhotra"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
