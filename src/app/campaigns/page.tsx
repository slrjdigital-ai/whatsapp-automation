'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import {
  Send,
  Plus,
  BarChart3,
  CheckCircle2,
  Clock,
  Play,
  ArrowRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (e) {
      console.error('Error fetching campaigns:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return (
    <AppShell
      title="Campaign Management & History"
      subtitle="Track active outreach, monitor delivery percentages, and review campaign statistics"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white">Outreach Campaigns History</h2>
          <p className="text-xs text-slate-400">
            All promotional WhatsApp campaigns executed from our official SLRJ DIGITAL business profile.
          </p>
        </div>

        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba5a] hover:to-[#0f7569] text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all active:scale-95 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Campaign</span>
        </Link>
      </div>

      <div className="rounded-xl border border-[#232738] bg-[#11131b] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161824] text-slate-400 border-b border-[#232738]">
              <tr>
                <th className="p-3">Campaign Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Template Used</th>
                <th className="p-3">Audience Size</th>
                <th className="p-3">Sent / Eligible</th>
                <th className="p-3">Delivery Rate</th>
                <th className="p-3">Read Rate</th>
                <th className="p-3">Launch Date</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2232] text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No campaigns created yet. Click "Create New Campaign" to get started!
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => {
                  const deliveryPct =
                    camp.sentCount > 0 ? Math.round((camp.deliveredCount / camp.sentCount) * 100) : 0;
                  const readPct =
                    camp.deliveredCount > 0 ? Math.round((camp.readCount / camp.deliveredCount) * 100) : 0;

                  return (
                    <tr key={camp.id} className="hover:bg-[#161824] transition-colors">
                      <td className="p-3">
                        <Link href={`/campaigns/${camp.id}`} className="font-semibold text-white hover:text-[#25D366] transition-colors block">
                          {camp.name}
                        </Link>
                        {camp.description && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs">{camp.description}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            camp.status === 'COMPLETED'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : camp.status === 'RUNNING'
                              ? 'bg-blue-950/60 text-blue-400 border border-blue-500/30 animate-pulse'
                              : camp.status === 'PAUSED'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {camp.template?.displayName || 'Custom Session Message'}
                      </td>
                      <td className="p-3 font-mono text-slate-300">{camp.totalContacts}</td>
                      <td className="p-3 font-mono font-medium">
                        <span className="text-white">{camp.sentCount}</span> /{' '}
                        <span className="text-emerald-400">{camp.eligibleContacts}</span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-emerald-400">
                        {deliveryPct}%
                      </td>
                      <td className="p-3 font-mono font-semibold text-[#53bdeb]">
                        {readPct}%
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        {new Date(camp.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/campaigns/${camp.id}`}
                          className="px-2.5 py-1 rounded bg-[#1c202d] hover:bg-[#252a3b] border border-[#2e344a] text-slate-300 hover:text-white inline-flex items-center gap-1 text-[11px] font-semibold transition-colors"
                        >
                          <span>Analytics</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
