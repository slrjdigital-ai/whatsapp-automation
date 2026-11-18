'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  Users,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  MoreVertical,
  X,
  Phone,
  Eye,
  FileCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';
import Papa from 'papaparse';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [counts, setCounts] = useState<{
    all: number;
    optedIn: number;
    pendingVerification: number;
    optedOut: number;
    invalid: number;
  }>({
    all: 0,
    optedIn: 0,
    pendingVerification: 0,
    optedOut: 0,
    invalid: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPTED_IN' | 'PENDING_VERIFICATION' | 'OPTED_OUT' | 'INVALID'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [currentContact, setCurrentContact] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    businessName: '',
    email: '',
    category: 'General',
    consentStatus: 'PENDING_VERIFICATION',
    consentSource: 'MANUAL_ADMIN',
    consentEvidence: '',
    notes: '',
  });

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const consentParam = activeTab === 'INVALID' ? 'ALL' : activeTab;
      const statusParam = activeTab === 'INVALID' ? 'INVALID' : 'ALL';

      const query = new URLSearchParams({
        search,
        consent: consentParam,
        status: statusParam,
        category: categoryFilter,
      });

      const res = await fetch(`/api/contacts?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        setCategories(data.categories || []);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (e) {
      console.error('Error fetching contacts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [activeTab, categoryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContacts();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(contacts.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create contact');

      setIsAddModalOpen(false);
      setFormData({
        fullName: '',
        mobileNumber: '',
        businessName: '',
        email: '',
        category: 'General',
        consentStatus: 'PENDING_VERIFICATION',
        consentSource: 'MANUAL_ADMIN',
        consentEvidence: '',
        notes: '',
      });
      fetchContacts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContact) return;

    try {
      const res = await fetch(`/api/contacts/${currentContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update contact');

      setIsEditModalOpen(false);
      setCurrentContact(null);
      fetchContacts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} contact(s)?`)) return;

    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedIds }),
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchContacts();
      }
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const openEditModal = (contact: any) => {
    setCurrentContact(contact);
    setFormData({
      fullName: contact.fullName,
      mobileNumber: contact.mobileNumber,
      businessName: contact.businessName || '',
      email: contact.email || '',
      category: contact.category || 'General',
      consentStatus: contact.consentStatus,
      consentSource: contact.consentSource || 'MANUAL_ADMIN',
      consentEvidence: contact.consentEvidence || '',
      notes: contact.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const openInspectModal = (contact: any) => {
    setCurrentContact(contact);
    setIsInspectModalOpen(true);
  };

  const exportContactsCsv = () => {
    if (contacts.length === 0) return;
    const exportData = contacts.map((c) => ({
      'Full Name': c.fullName,
      'Mobile Number': c.mobileNumber,
      'Business Name': c.businessName || '',
      'Email': c.email || '',
      'Category': c.category || '',
      'Consent Status': c.consentStatus,
      'Consent Source': c.consentSource || '',
      'Consent Date': c.consentDate ? new Date(c.consentDate).toLocaleDateString() : '',
      'Consent Evidence': c.consentEvidence || '',
      'Created At': new Date(c.createdAt).toLocaleDateString(),
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SLRJ_DIGITAL_Contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <AppShell
      title="Contact Management & Consent Governance"
      subtitle="Complete database of verified contacts, marketing consent records, and suppression lists"
    >
      {/* Required Filter Tabs Bar with Total Counts */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'ALL'
              ? 'bg-slate-200 text-black shadow-md'
              : 'bg-[#12141c] text-slate-400 hover:text-white border border-[#202434]'
          }`}
        >
          <span>All Contacts</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'ALL' ? 'bg-black text-white' : 'bg-[#1c202d] text-slate-300'
          }`}>
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('OPTED_IN')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'OPTED_IN'
              ? 'bg-[#25D366] text-black shadow-md shadow-emerald-950/40'
              : 'bg-[#12141c] text-emerald-400 hover:text-emerald-300 border border-emerald-500/20'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Opted-In Contacts</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'OPTED_IN' ? 'bg-black text-[#25D366]' : 'bg-[#14261c] text-emerald-400'
          }`}>
            {counts.optedIn}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PENDING_VERIFICATION')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'PENDING_VERIFICATION'
              ? 'bg-amber-400 text-black shadow-md'
              : 'bg-[#12141c] text-amber-400 hover:text-amber-300 border border-amber-500/20'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Pending Consent</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'PENDING_VERIFICATION' ? 'bg-black text-amber-400' : 'bg-[#262114] text-amber-400'
          }`}>
            {counts.pendingVerification}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('OPTED_OUT')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'OPTED_OUT'
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-[#12141c] text-red-400 hover:text-red-300 border border-red-500/20'
          }`}
        >
          <XCircle className="h-3.5 w-3.5" />
          <span>Opted-Out Contacts</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'OPTED_OUT' ? 'bg-black text-red-400' : 'bg-[#261414] text-red-400'
          }`}>
            {counts.optedOut}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('INVALID')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'INVALID'
              ? 'bg-slate-700 text-white shadow-md'
              : 'bg-[#12141c] text-slate-400 hover:text-white border border-[#202434]'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Invalid Numbers</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'INVALID' ? 'bg-black text-slate-300' : 'bg-[#1c202d] text-slate-400'
          }`}>
            {counts.invalid}
          </span>
        </button>
      </div>

      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or company..."
              className="bg-[#181a24] border border-[#2b3044] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#25D366] w-64"
            />
          </form>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#25D366]"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            onClick={fetchContacts}
            className="p-1.5 rounded-lg bg-[#181a24] hover:bg-[#202332] border border-[#2b3044] text-slate-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={exportContactsCsv}
            className="px-3 py-1.5 rounded-lg bg-[#181a24] hover:bg-[#202332] border border-[#2b3044] text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba5a] hover:to-[#0f7569] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="rounded-xl border border-[#232738] bg-[#11131b] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161824] text-slate-400 border-b border-[#232738]">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selectedIds.length === contacts.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded bg-[#1b1f2c] border-[#2d3348] text-[#25D366] focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-3">Contact</th>
                <th className="p-3">Normalized Mobile (E.164)</th>
                <th className="p-3">Business & Category</th>
                <th className="p-3">Marketing Consent</th>
                <th className="p-3">Consent Evidence / Source</th>
                <th className="p-3">Opt-In Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2232] text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Loading contacts...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No contacts found matching the active filter ({activeTab}).
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-[#161824] transition-colors">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded bg-[#1b1f2c] border-[#2d3348] text-[#25D366] focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{c.fullName}</div>
                      {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                    </td>
                    <td className="p-3 font-mono font-medium text-emerald-400">
                      {c.mobileNumber}
                    </td>
                    <td className="p-3 text-slate-300">
                      <div>{c.businessName || '—'}</div>
                      <span className="text-[10px] text-slate-500">{c.category || 'General'}</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          c.consentStatus === 'OPTED_IN'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                            : c.consentStatus === 'OPTED_OUT'
                            ? 'bg-red-950/60 text-red-400 border border-red-500/30'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {c.consentStatus === 'OPTED_IN'
                          ? 'OPTED IN'
                          : c.consentStatus === 'OPTED_OUT'
                          ? 'OPTED OUT'
                          : 'PENDING'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">
                      <div className="text-[11px] font-mono text-slate-300 truncate max-w-[160px]">
                        {c.consentSource || 'NOT_DOCUMENTED'}
                      </div>
                      {c.consentEvidence && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[160px]" title={c.consentEvidence}>
                          Ref: {c.consentEvidence}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {c.consentDate ? new Date(c.consentDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openInspectModal(c)}
                          className="px-2 py-1 rounded bg-[#1b1f2c] hover:bg-[#252a3b] border border-[#2d3348] text-slate-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          title="Inspect Consent History"
                        >
                          <Eye className="h-3 w-3 text-blue-400" />
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#202434] transition-colors"
                          title="Edit Contact"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Consent Details Modal (Requirement 3) */}
      {isInspectModalOpen && currentContact && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-[#232738] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1f2434] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-[#25D366]" />
                <h3 className="text-base font-bold text-white">
                  Consent Verification & Audit File
                </h3>
              </div>
              <button onClick={() => setIsInspectModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="p-4 rounded-xl bg-[#161925] border border-[#252a3b] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">{currentContact.fullName}</h4>
                  <div className="text-xs text-slate-400 font-mono">{currentContact.mobileNumber}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                    currentContact.consentStatus === 'OPTED_IN'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : currentContact.consentStatus === 'OPTED_OUT'
                      ? 'bg-red-950 text-red-400 border border-red-500/40'
                      : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {currentContact.consentStatus}
                </span>
              </div>
              {currentContact.businessName && (
                <div className="text-xs text-slate-300">
                  Business: <strong>{currentContact.businessName}</strong> ({currentContact.category || 'General'})
                </div>
              )}
            </div>

            {/* Consent Evidence & Source */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Documented Consent Attributes
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#181a24] border border-[#242938]">
                  <span className="text-slate-500 block text-[11px]">Consent Source:</span>
                  <span className="font-mono text-slate-200 font-semibold">{currentContact.consentSource || 'None Documented'}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#181a24] border border-[#242938]">
                  <span className="text-slate-500 block text-[11px]">Consent Timestamp:</span>
                  <span className="font-mono text-slate-200 font-semibold">
                    {currentContact.consentDate ? new Date(currentContact.consentDate).toLocaleString() : 'No timestamp'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#181a24] border border-[#242938] text-xs">
                <span className="text-slate-500 block text-[11px] mb-1">Evidence Reference / Audit Proof:</span>
                <p className="text-slate-200 font-mono text-[11px]">
                  {currentContact.consentEvidence || 'No reference id provided. Recommend collecting proof via /consent portal.'}
                </p>
              </div>

              {/* Promotional Eligibility Check Card */}
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                currentContact.consentStatus === 'OPTED_IN'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              }`}>
                {currentContact.consentStatus === 'OPTED_IN' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Eligible for WhatsApp Marketing:</strong> This contact has recorded affirmative opt-in consent and is eligible to receive official promotional campaigns.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Ineligible for Promotional Campaigns:</strong> WhatsApp policies require affirmative marketing opt-in consent before promotional templates can be dispatched.
                    </span>
                  </>
                )}
              </div>

              {/* Chronological Consent History */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Consent Audit Trail History
                </h4>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {currentContact.consents && currentContact.consents.length > 0 ? (
                    currentContact.consents.map((cs: any) => (
                      <div key={cs.id} className="p-2.5 rounded-lg bg-[#141620] border border-[#212433] text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{cs.status}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{new Date(cs.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Source: <span className="text-slate-300 font-mono">{cs.source}</span>
                        </div>
                        {cs.notes && <div className="text-[11px] text-slate-500 italic">{cs.notes}</div>}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-xs text-center py-2">No previous consent records logged.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#1f2434]">
              <button
                onClick={() => setIsInspectModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#181a24] text-xs font-semibold text-slate-300 hover:text-white"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-[#232738] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1f2434] pb-3">
              <h3 className="text-base font-bold text-white">
                {isAddModalOpen ? 'Add Contact with Documented Consent' : 'Edit Contact & Consent Details'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={isAddModalOpen ? handleCreateContact : handleUpdateContact}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Vikram Malhotra"
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Number (with country code) *
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditModalOpen}
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="e.g. +91 98200 11223"
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366] disabled:opacity-50 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Malhotra Retails"
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category / Industry
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. E-Commerce"
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Marketing Consent Status *
                  </label>
                  <select
                    value={formData.consentStatus}
                    onChange={(e) => setFormData({ ...formData, consentStatus: e.target.value })}
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                  >
                    <option value="OPTED_IN">Opted In (Verified Affirmative Opt-In)</option>
                    <option value="PENDING_VERIFICATION">Pending Verification (Unverified/Missing)</option>
                    <option value="OPTED_OUT">Opted Out (Unsubscribe/STOP requested)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Consent Source
                  </label>
                  <select
                    value={formData.consentSource}
                    onChange={(e) => setFormData({ ...formData, consentSource: e.target.value })}
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                  >
                    <option value="WEBSITE_FORM">Website Form</option>
                    <option value="CUSTOMER_ENQUIRY">Customer Enquiry</option>
                    <option value="IN_STORE_SIGNUP">In-Store / Event Signup</option>
                    <option value="EXCEL_IMPORT">Excel / CSV Import</option>
                    <option value="MANUAL_ADMIN">Documented Admin Verification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Consent Evidence / Reference
                  </label>
                  <input
                    type="text"
                    value={formData.consentEvidence}
                    onChange={(e) => setFormData({ ...formData, consentEvidence: e.target.value })}
                    placeholder="e.g. Lead Form #1042 / Email Proof"
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional context on opt-in verification..."
                  rows={2}
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1f2434]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-3 py-2 rounded-lg bg-[#181b26] text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-black font-bold text-xs"
                >
                  {isAddModalOpen ? 'Save Contact' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
