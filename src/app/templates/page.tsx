'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import WhatsAppPreview from '@/components/WhatsAppPreview';
import {
  FileCode2,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  X,
} from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeTemplate, setActiveTemplate] = useState<any>(null);

  // New template modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    category: 'WEBSITE_DEV',
    language: 'en',
    headerType: 'TEXT',
    headerContent: 'SLRJ DIGITAL',
    bodyText: '',
    footerText: 'Reply STOP to unsubscribe',
  });

  const categories = [
    { key: 'ALL', label: 'All Templates' },
    { key: 'BUSINESS_INTRO', label: 'Business Introduction' },
    { key: 'WEBSITE_DEV', label: 'Website Development' },
    { key: 'ECOMMERCE', label: 'E-Commerce Solutions' },
    { key: 'MOBILE_APP', label: 'Mobile App Development' },
    { key: 'MARKETING', label: 'Digital Marketing & SEO' },
    { key: 'SPECIAL_OFFER', label: 'Special Offers & Promos' },
    { key: 'FOLLOW_UP', label: 'Follow-Up Messages' },
    { key: 'FEEDBACK', label: 'Client Feedback' },
  ];

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const query = selectedCategory !== 'ALL' ? `?category=${selectedCategory}` : '';
      const res = await fetch(`/api/templates${query}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        if (data.templates && data.templates.length > 0 && !activeTemplate) {
          setActiveTemplate(data.templates[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching templates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const handleSyncMeta = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC' }),
      });
      const data = await res.json();
      alert(`Meta Templates Synced! Found ${data.count} approved templates.`);
      fetchTemplates();
    } catch (e: any) {
      alert(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE', ...formData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create template');

      setIsModalOpen(false);
      setFormData({
        name: '',
        displayName: '',
        category: 'WEBSITE_DEV',
        language: 'en',
        headerType: 'TEXT',
        headerContent: 'SLRJ DIGITAL',
        bodyText: '',
        footerText: 'Reply STOP to unsubscribe',
      });
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const buttons = activeTemplate?.buttonsJson ? JSON.parse(activeTemplate.buttonsJson) : [];

  return (
    <AppShell
      title="Message Templates Library"
      subtitle="Meta-approved WhatsApp promotional and transactional message templates"
    >
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-[#25D366]" />
            <span>Approved Templates Registry</span>
          </h2>
          <p className="text-xs text-slate-400">
            Promotional outreach initiated outside the 24-hour service window strictly requires Meta-approved templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncMeta}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#181a24] hover:bg-[#202332] border border-[#2b3044] text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-[#25D366]' : ''}`} />
            <span>Sync with Meta WABA</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba5a] hover:to-[#0f7569] text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add Template</span>
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.key
                ? 'bg-slate-200 text-black font-semibold'
                : 'bg-[#12141c] text-slate-400 hover:text-white border border-[#202434]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates Grid & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Template Cards List (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No templates found for the selected category.
            </div>
          ) : (
            templates.map((tpl) => {
              const isSelected = activeTemplate?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setActiveTemplate(tpl)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#151925] border-[#25D366]/50 shadow-md shadow-emerald-950/20'
                      : 'bg-[#11131b] border-[#202434] hover:border-[#2f354a]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white text-xs tracking-tight">
                      {tpl.displayName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1d2d25] text-[#25D366] border border-[#25D366]/30 font-bold uppercase font-mono">
                        {tpl.status}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {tpl.language.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed whitespace-pre-wrap font-sans">
                    {tpl.bodyText}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-[#1d212f]">
                    <span className="font-mono text-[10px] text-slate-400">ID: {tpl.name}</span>
                    <span className="text-[#25D366] font-medium text-[11px]">
                      {isSelected ? 'Currently Previewing' : 'Click to Preview'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live Smartphone Preview (5 Cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              WhatsApp Interface Simulation
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {activeTemplate?.name || 'Selected'}
            </span>
          </div>

          <div className="flex justify-center">
            {activeTemplate ? (
              <WhatsAppPreview
                headerType={activeTemplate.headerType || 'TEXT'}
                headerContent={activeTemplate.headerContent || 'SLRJ DIGITAL'}
                bodyText={activeTemplate.bodyText}
                footerText={activeTemplate.footerText}
                buttons={buttons}
                sampleName="Vikram Malhotra"
              />
            ) : (
              <div className="w-[340px] h-[400px] rounded-3xl bg-[#11131b] border border-[#202434] flex items-center justify-center text-xs text-slate-500">
                Select a template to view mockup
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-[#232738] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1f2434] pb-3">
              <h3 className="text-base font-bold text-white">
                Register New WhatsApp Template
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Template Name (Identifier, lowercase_underscored) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. slrj_custom_outreach"
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Display Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. SLRJ Digital - Custom Client Pitch"
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                  >
                    <option value="BUSINESS_INTRO">Business Introduction</option>
                    <option value="WEBSITE_DEV">Website Development</option>
                    <option value="ECOMMERCE">E-Commerce Solutions</option>
                    <option value="MOBILE_APP">Mobile App Development</option>
                    <option value="MARKETING">Digital Marketing & SEO</option>
                    <option value="SPECIAL_OFFER">Special Offer</option>
                    <option value="FOLLOW_UP">Follow-Up</option>
                    <option value="FEEDBACK">Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Header Title
                  </label>
                  <input
                    type="text"
                    value={formData.headerContent}
                    onChange={(e) => setFormData({ ...formData, headerContent: e.target.value })}
                    placeholder="SLRJ DIGITAL"
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Body (Use {'{{name}}'} for variables) *
                </label>
                <textarea
                  rows={6}
                  required
                  value={formData.bodyText}
                  onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                  placeholder="Hello {{name}}! Greetings from SLRJ DIGITAL..."
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg p-3 text-xs text-white font-mono focus:outline-none focus:border-[#25D366]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Footer Text
                </label>
                <input
                  type="text"
                  value={formData.footerText}
                  onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                  placeholder="Reply STOP to unsubscribe"
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#25D366]"
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
                  className="px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-black font-bold text-xs"
                >
                  Save & Register Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
