'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import {
  ShieldBan,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  X,
} from 'lucide-react';

export default function SuppressionPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    mobileNumber: '',
    reason: 'USER_STOP',
    notes: '',
  });

  const fetchSuppressionList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppression?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setList(data.suppressionList || []);
      }
    } catch (e) {
      console.error('Error fetching suppression list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppressionList();
  }, [search]);

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/suppression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add suppression');

      setIsModalOpen(false);
      setFormData({ mobileNumber: '', reason: 'USER_STOP', notes: '' });
      fetchSuppressionList();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemove = async (mobileNumber: string) => {
    if (!confirm(`Are you sure you want to remove ${mobileNumber} from the suppression list?`)) return;

    try {
      const res = await fetch('/api/suppression', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
      });
      if (res.ok) {
        fetchSuppressionList();
      }
    } catch (e) {
      console.error('Delete suppression error:', e);
    }
  };

  return (
    <AppShell
      title="Opt-Out Management & Suppression List"
      subtitle="Guaranteed compliance with WhatsApp anti-spam policies and automated STOP keyword suppression"
    >
      {/* Information Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#17141f] via-[#1c1424] to-[#17141f] border border-red-500/20 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <ShieldBan className="h-5 w-5 text-red-400" />
          <h2 className="text-sm font-bold text-white">
            Zero-Tolerance Marketing Suppression Protection
          </h2>
        </div>
        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
          Every number on this suppression list is <strong>permanently blocked</strong> from receiving any future promotional messages. 
          When an end-user sends an inbound message containing <strong>"STOP"</strong>, <strong>"UNSUBSCRIBE"</strong>, or <strong>"QUIT"</strong>, our official Meta webhook instantly catches it, updates the contact's consent to <code>OPTED_OUT</code>, and registers them here automatically.
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppressed number or reason..."
            className="bg-[#181a24] border border-[#2b3044] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#25D366] w-64"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-900/60 hover:bg-red-800 border border-red-500/40 text-red-200 text-xs font-bold transition-all active:scale-95 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Number to Suppression</span>
        </button>
      </div>

      {/* Suppression Table */}
      <div className="rounded-xl border border-[#232738] bg-[#11131b] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161824] text-slate-400 border-b border-[#232738]">
              <tr>
                <th className="p-3">Suppressed Mobile (E.164)</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Suppression Source</th>
                <th className="p-3">Notes / Inbound Text</th>
                <th className="p-3">Date Suppressed</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2232] text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading suppression records...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No numbers currently suppressed.
                  </td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item.id} className="hover:bg-[#161824] transition-colors">
                    <td className="p-3 font-mono font-semibold text-red-400">
                      {item.mobileNumber}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-950/60 text-red-300 border border-red-500/30">
                        {item.reason}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">
                      {item.suppressedBy || 'SYSTEM_WEBHOOK'}
                    </td>
                    <td className="p-3 text-slate-300 max-w-xs truncate">
                      {item.notes || 'Opted out from marketing outreach'}
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleRemove(item.mobileNumber)}
                        className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-[#202434] transition-colors"
                        title="Remove from suppression"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Suppression Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-[#232738] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1f2434] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldBan className="h-4 w-4 text-red-400" />
                <span>Add Number to Suppression</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSuppression} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Number (with Country Code) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="e.g. +91 98200 11223"
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Suppression Reason
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
                >
                  <option value="USER_STOP">USER_STOP (Requested Opt-Out)</option>
                  <option value="MANUAL_ADMIN">MANUAL_ADMIN (Administrator Decision)</option>
                  <option value="COMPLAINT">COMPLAINT (Direct Feedback)</option>
                  <option value="INVALID_NUMBER">INVALID_NUMBER (Permanent Delivery Failure)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Reasoning or reference for suppression..."
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1f2434]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-[#181b26] text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                >
                  Confirm Suppression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
