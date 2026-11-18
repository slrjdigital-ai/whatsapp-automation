'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  Send,
  Pause,
  Play,
  XCircle,
  Download,
  CheckCircle2,
  CheckCheck,
  Eye,
  AlertTriangle,
  Clock,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = params?.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data.campaign);
      }
    } catch (e) {
      console.error('Error fetching campaign details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();

    // Auto refresh while campaign is in RUNNING state
    const interval = setInterval(() => {
      fetchCampaign();
    }, 3000);

    return () => clearInterval(interval);
  }, [campaignId]);

  const handleAction = async (action: 'start' | 'pause' | 'resume' | 'cancel') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/${action}`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchCampaign();
      }
    } catch (e) {
      console.error(`Action ${action} failed:`, e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCsv = () => {
    window.open(`/api/campaigns/${campaignId}/export`, '_blank');
  };

  if (loading && !campaign) {
    return (
      <AppShell title="Campaign Analytics" subtitle="Loading campaign metrics...">
        <div className="p-12 text-center text-slate-500">Loading campaign report...</div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell title="Campaign Not Found" subtitle="Requested campaign does not exist">
        <div className="p-12 text-center text-slate-500">
          Campaign record was not found.{' '}
          <Link href="/campaigns" className="text-[#25D366] underline">
            Return to all campaigns
          </Link>
        </div>
      </AppShell>
    );
  }

  const completionPercentage =
    campaign.eligibleContacts > 0
      ? Math.round((campaign.sentCount / campaign.eligibleContacts) * 100)
      : 0;

  return (
    <AppShell
      title={campaign.name}
      subtitle={`Campaign Report • Created ${new Date(campaign.createdAt).toLocaleString()}`}
    >
      {/* Header Bar & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="p-2 rounded-lg bg-[#181a24] hover:bg-[#202332] border border-[#2b3044] text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                  campaign.status === 'COMPLETED'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : campaign.status === 'RUNNING'
                    ? 'bg-blue-950/60 text-blue-400 border border-blue-500/30 animate-pulse'
                    : campaign.status === 'PAUSED'
                    ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {campaign.status}
              </span>
              {campaign.isDemo && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30 font-semibold">
                  Demo Simulation
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">{campaign.description || 'WhatsApp Outreach Campaign'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {campaign.status === 'RUNNING' && (
            <button
              onClick={() => handleAction('pause')}
              disabled={actionLoading}
              className="px-3.5 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause Campaign</span>
            </button>
          )}

          {campaign.status === 'PAUSED' && (
            <button
              onClick={() => handleAction('resume')}
              disabled={actionLoading}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Resume Campaign</span>
            </button>
          )}

          {(campaign.status === 'RUNNING' || campaign.status === 'PAUSED' || campaign.status === 'DRAFT') && (
            <button
              onClick={() => handleAction('cancel')}
              disabled={actionLoading}
              className="px-3.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-lg bg-[#181a24] hover:bg-[#202332] border border-[#2b3044] text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Progress Bar Banner */}
      <div className="p-5 rounded-2xl bg-[#131520] border border-[#232738] space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Campaign Execution Progress</span>
          <span className="font-mono text-emerald-400 font-bold">
            {campaign.sentCount} of {campaign.eligibleContacts} Sent ({completionPercentage}%)
          </span>
        </div>
        <div className="w-full bg-[#1e2230] rounded-full h-3 overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-[#25D366] to-[#128C7E] h-2 rounded-full transition-all duration-700 shadow-sm"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Started: {campaign.startedAt ? new Date(campaign.startedAt).toLocaleTimeString() : 'Not started'}</span>
          <span>Completed: {campaign.completedAt ? new Date(campaign.completedAt).toLocaleTimeString() : 'In Progress'}</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-4 rounded-xl bg-[#11131b] border border-[#232738]">
          <span className="text-[11px] text-slate-400 block mb-1">Audience Evaluated</span>
          <div className="text-xl font-bold text-white font-mono">{campaign.totalContacts}</div>
        </div>

        <div className="p-4 rounded-xl bg-[#11131b] border border-emerald-500/30">
          <span className="text-[11px] text-emerald-300 block mb-1">Opted-In Eligible</span>
          <div className="text-xl font-bold text-emerald-400 font-mono">{campaign.eligibleContacts}</div>
        </div>

        <div className="p-4 rounded-xl bg-[#11131b] border border-[#232738]">
          <span className="text-[11px] text-slate-400 block mb-1">Submitted / Sent</span>
          <div className="text-xl font-bold text-blue-400 font-mono">{campaign.sentCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-[#11131b] border border-[#232738]">
          <span className="text-[11px] text-slate-400 block mb-1">Delivered</span>
          <div className="text-xl font-bold text-slate-200 font-mono">{campaign.deliveredCount}</div>
          <span className="text-[10px] text-emerald-400 font-semibold">{campaign.deliveryRate}% rate</span>
        </div>

        <div className="p-4 rounded-xl bg-[#11131b] border border-[#232738]">
          <span className="text-[11px] text-slate-400 block mb-1">Read by Users</span>
          <div className="text-xl font-bold text-[#53bdeb] font-mono">{campaign.readCount}</div>
          <span className="text-[10px] text-[#53bdeb] font-semibold">{campaign.readRate}% rate</span>
        </div>

        <div className="p-4 rounded-xl bg-[#11131b] border border-[#232738]">
          <span className="text-[11px] text-slate-400 block mb-1">Failed</span>
          <div className="text-xl font-bold text-red-400 font-mono">{campaign.failedCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-[#11131b] border border-[#232738]">
          <span className="text-[11px] text-slate-400 block mb-1">Pending in Queue</span>
          <div className="text-xl font-bold text-amber-400 font-mono">{campaign.pendingCount}</div>
        </div>
      </div>

      {/* Recipient Send Log Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white tracking-tight">
          Recipient Dispatch & Status Audit Log
        </h3>

        <div className="rounded-xl border border-[#232738] bg-[#11131b] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161824] text-slate-400 border-b border-[#232738]">
                <tr>
                  <th className="p-3">Recipient Name</th>
                  <th className="p-3">Mobile (E.164)</th>
                  <th className="p-3">Current Status</th>
                  <th className="p-3">WhatsApp Message ID (WAMID)</th>
                  <th className="p-3">Sent At</th>
                  <th className="p-3">Delivered At</th>
                  <th className="p-3">Read At</th>
                  <th className="p-3">Notes / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2232] text-slate-200 font-mono">
                {campaign.campaignContacts && campaign.campaignContacts.length > 0 ? (
                  campaign.campaignContacts.map((item: any) => (
                    <tr key={item.id} className="hover:bg-[#161824] transition-colors font-sans">
                      <td className="p-3 font-semibold text-white">
                        {item.contact.fullName}
                      </td>
                      <td className="p-3 font-mono text-emerald-400">
                        {item.contact.mobileNumber}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            item.status === 'READ'
                              ? 'bg-blue-950/60 text-[#53bdeb] border border-blue-500/30'
                              : item.status === 'DELIVERED'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : item.status === 'SENT'
                              ? 'bg-slate-800 text-slate-300'
                              : item.status === 'FAILED'
                              ? 'bg-red-950/60 text-red-400 border border-red-500/30'
                              : item.status === 'SKIPPED'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400 truncate max-w-[200px]" title={item.whatsappMessageId || ''}>
                        {item.whatsappMessageId || '—'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {item.sentAt ? new Date(item.sentAt).toLocaleTimeString() : '—'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {item.deliveredAt ? new Date(item.deliveredAt).toLocaleTimeString() : '—'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-[#53bdeb]">
                        {item.readAt ? new Date(item.readAt).toLocaleTimeString() : '—'}
                      </td>
                      <td className="p-3 text-[11px] text-slate-400">
                        {item.errorMessage ? (
                          <span className="text-red-400 font-sans">{item.errorMessage}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No contacts assigned to this campaign.
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
