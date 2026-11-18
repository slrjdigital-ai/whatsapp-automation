'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <AppShell
      title="Security & System Audit Trail"
      subtitle="Immutable cryptographic log of all administrative actions, campaign dispatches, and consent changes"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#25D366]" />
            <span>Administrative Audit History</span>
          </h2>
          <p className="text-xs text-slate-400">
            Records all user logins, contact uploads, opt-in consent updates, and campaign dispatch triggers.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#181a24] hover:bg-[#202332] border border-[#2b3044] text-xs font-semibold text-slate-300 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#25D366]' : ''}`} />
          <span>Refresh Audit Log</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-[#232738] bg-[#11131b] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161824] text-slate-400 border-b border-[#232738]">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Action</th>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Target Entity</th>
                <th className="p-3">Event Details</th>
                <th className="p-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2232] text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No audit records registered yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#161824] transition-colors">
                    <td className="p-3 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#18202d] text-blue-400 border border-blue-500/30">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-white">
                      {log.user?.name || 'System Service'}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">
                      {log.user?.role || 'SYSTEM'}
                    </td>
                    <td className="p-3 text-slate-300">
                      {log.entityType} {log.entityId ? `(#${log.entityId.slice(0, 8)})` : ''}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400 max-w-sm truncate" title={log.details || ''}>
                      {log.details || '—'}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
