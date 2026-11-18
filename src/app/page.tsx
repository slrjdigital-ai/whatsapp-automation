'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import {
  Users,
  CheckCircle2,
  XCircle,
  Copy,
  UserCheck,
  Send,
  MessageSquare,
  CheckCheck,
  Eye,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto refresh every 10 seconds for real-time campaign progress tracking
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats = data?.stats;
  const messages = stats?.messages;
  const whatsapp = data?.whatsapp;

  return (
    <AppShell
      title="Outreach Command Center"
      subtitle="SLRJ DIGITAL Official WhatsApp Cloud Marketing Automation & Intelligence"
    >
      {/* Top Banner & Quick Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#12141c] via-[#161a25] to-[#12141c] border border-[#232738] shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1d2d25] text-[#25D366] border border-[#25D366]/40 uppercase tracking-wider">
              {whatsapp?.isConnected ? 'Official Cloud API Active' : 'Meta API Disconnected'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Quality Rating: <strong className="text-emerald-400">{whatsapp?.qualityRating || 'GREEN'}</strong>
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Welcome back to SLRJ DIGITAL Bulk Outreach Engine
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Streamlined promotional campaigns sent exclusively to verified opted-in mobile contacts from our official WhatsApp Business account.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchStats();
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a1e2b] hover:bg-[#23283a] border border-[#2c3349] text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#25D366]' : ''}`} />
            <span>Refresh Stats</span>
          </button>
          <Link
            href="/campaigns/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba5a] hover:to-[#0f7569] text-white text-xs font-bold shadow-md shadow-emerald-950/50 transition-all active:scale-95"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Launch Campaign</span>
          </Link>
        </div>
      </div>

      {/* Row 1: Contact Hygiene & Compliance Metrics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span>Audience Hygiene & Opt-In Compliance</span>
          </h3>
          <Link href="/contacts" className="text-xs text-[#25D366] hover:underline flex items-center gap-1">
            <span>Manage Contacts</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Uploaded */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-[#202434] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Total Uploaded</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {stats?.totalContacts ?? '—'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">In contact registry</div>
          </div>

          {/* Valid Mobile Numbers */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-[#202434] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Valid Numbers</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {stats?.validContacts ?? '—'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">ITU E.164 verified</div>
          </div>

          {/* Eligible Opted-in */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-emerald-500/30 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 h-10 w-10 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium text-emerald-300">Opted-In Eligible</span>
              <UserCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-300 font-mono">
              {stats?.optedInContacts ?? '—'}
            </div>
            <div className="text-[10px] text-emerald-400/80 font-medium mt-1">WhatsApp Marketing Ready</div>
          </div>

          {/* Unknown / Non-Opted-In */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-[#202434] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Pending Verification</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {stats?.unknownConsentContacts ?? '—'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Excluded from outreach</div>
          </div>

          {/* Suppressed / Opted-Out */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-[#202434] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Suppressed (STOP)</span>
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-400 font-mono">
              {stats?.totalSuppressed ?? '—'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Do Not Contact list</div>
          </div>

          {/* Invalid Numbers */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-[#202434] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Invalid Numbers</span>
              <AlertTriangle className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-black text-slate-400 font-mono">
              {stats?.invalidContacts ?? 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Malformed format</div>
          </div>
        </div>
      </div>

      {/* Row 2: Campaign Outreach Performance Metrics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Send className="h-4 w-4 text-[#25D366]" />
            <span>Campaign Delivery & Engagement Analytics</span>
          </h3>
          <Link href="/campaigns" className="text-xs text-[#25D366] hover:underline flex items-center gap-1">
            <span>View All Campaigns ({stats?.totalCampaigns ?? 0})</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Total Messages Sent */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-[#202434] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Messages Sent</span>
              <MessageSquare className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {messages?.sent ?? 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Dispatched to Meta</div>
          </div>

          {/* Delivered */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-[#202434] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Delivered</span>
              <CheckCheck className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-200 font-mono">
              {messages?.delivered ?? 0}
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold mt-1">
              {messages?.deliveryRate ?? 0}% Delivery Rate
            </div>
          </div>

          {/* Read */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-[#202434] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Read by Recipients</span>
              <Eye className="h-4 w-4 text-[#53bdeb]" />
            </div>
            <div className="text-2xl font-black text-[#53bdeb] font-mono">
              {messages?.read ?? 0}
            </div>
            <div className="text-[10px] text-[#53bdeb] font-semibold mt-1">
              {messages?.readRate ?? 0}% Read Rate
            </div>
          </div>

          {/* Failed */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-[#202434] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Failed</span>
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-400 font-mono">
              {messages?.failed ?? 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Undeliverable / Blocked</div>
          </div>

          {/* Pending */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-[#202434] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Pending in Queue</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {messages?.pending ?? 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Scheduled / Throttled</div>
          </div>

          {/* Total Campaigns */}
          <div className="p-4 rounded-xl bg-[#11131b] border border-[#202434] shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Total Campaigns</span>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400 font-mono">
              {stats?.totalCampaigns ?? 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Outreach runs</div>
          </div>
        </div>
      </div>

      {/* Row 3: Interactive Analytics Chart & Recent Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#11131b] border border-[#202434] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Outreach Velocity & Engagement Trends
              </h3>
              <p className="text-xs text-slate-400">
                Messages sent, delivered, and read across the past 7 days
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                <span className="text-slate-400">Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                <span className="text-slate-400">Delivered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#53bdeb]" />
                <span className="text-slate-400">Read</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            {data?.chartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#53bdeb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#53bdeb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2433" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#12141c',
                      borderColor: '#2b3042',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" name="Sent" />
                  <Area type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDelivered)" name="Delivered" />
                  <Area type="monotone" dataKey="read" stroke="#53bdeb" strokeWidth={2} fillOpacity={1} fill="url(#colorRead)" name="Read" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Loading analytics data...
              </div>
            )}
          </div>
        </div>

        {/* Recent Campaigns List */}
        <div className="p-5 rounded-2xl bg-[#11131b] border border-[#202434] shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Recent Campaigns
              </h3>
              <Link href="/campaigns" className="text-xs text-[#25D366] hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {data?.recentCampaigns && data.recentCampaigns.length > 0 ? (
                data.recentCampaigns.map((camp: any) => {
                  return (
                    <Link
                      key={camp.id}
                      href={`/campaigns/${camp.id}`}
                      className="block p-3 rounded-xl bg-[#161822] hover:bg-[#1c202d] border border-[#242838] transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate max-w-[180px]">
                          {camp.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                            camp.status === 'COMPLETED'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : camp.status === 'RUNNING'
                              ? 'bg-blue-950/60 text-blue-400 border border-blue-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between mb-2">
                        <span>{camp.template?.displayName || 'Outreach Template'}</span>
                        <span className="font-mono">{camp.sentCount}/{camp.eligibleContacts} sent</span>
                      </div>

                      {/* Mini progress bar */}
                      <div className="w-full bg-[#202534] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#25D366] h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              camp.eligibleContacts > 0
                                ? Math.round((camp.sentCount / camp.eligibleContacts) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  No campaigns launched yet.
                </div>
              )}
            </div>
          </div>

          <Link
            href="/campaigns/new"
            className="w-full mt-4 py-2.5 rounded-xl bg-[#191d29] hover:bg-[#202535] border border-[#2b3145] text-center text-xs font-semibold text-slate-200 transition-colors block"
          >
            + Create New Outreach Campaign
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
