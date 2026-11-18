'use client';

import React, { useState, useRef } from 'react';
import AppShell from '@/components/AppShell';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
  Check,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Clock,
  XCircle,
  FileCheck,
  Info,
} from 'lucide-react';

export default function UploadContactsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [previewSummary, setPreviewSummary] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState('SLRJ Digital Outreach Lead Batch');
  const [overrideConsent, setOverrideConsent] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter state for preview table
  const [tableFilter, setTableFilter] = useState<'ALL' | 'ELIGIBLE' | 'PENDING' | 'OPTED_OUT' | 'DUPLICATE' | 'INVALID'>('ALL');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setLoading(true);
    setErrorMsg(null);
    setImportSuccess(null);

    try {
      let rawData: any[] = [];
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        rawData = parsed.data;
      } else if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        rawData = XLSX.utils.sheet_to_json(worksheet);
      } else {
        throw new Error('Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      }

      if (rawData.length === 0) {
        throw new Error('The uploaded file contains no data rows.');
      }

      // Send to server for robust column detection, E.164 normalization, and consent verification
      const res = await fetch('/api/contacts/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PREVIEW',
          fileName: file.name,
          rows: rawData,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to analyze contacts');
      }

      setPreviewSummary(resData.summary);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing file');
      setPreviewSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectRow = (index: number) => {
    if (!previewSummary) return;
    const newRows = [...previewSummary.rows];
    newRows[index].selected = !newRows[index].selected;
    setPreviewSummary({ ...previewSummary, rows: newRows });
  };

  const toggleSelectAll = (select: boolean) => {
    if (!previewSummary) return;
    const newRows = previewSummary.rows.map((r: any) => ({
      ...r,
      selected: select && r.isValidNumber && !r.isDuplicateInBatch && !r.isSuppressed,
    }));
    setPreviewSummary({ ...previewSummary, rows: newRows });
  };

  const handleImportToDatabase = async () => {
    if (!previewSummary) return;
    setImporting(true);
    setErrorMsg(null);

    try {
      const selectedRows = previewSummary.rows.filter((r: any) => r.selected);

      if (selectedRows.length === 0) {
        throw new Error('No contacts are currently selected for import.');
      }

      const res = await fetch('/api/contacts/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMMIT',
          fileName,
          rows: selectedRows,
          groupName: selectedGroup,
          overrideExistingConsent: overrideConsent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to commit contacts to database');
      }

      setImportSuccess(data.summary);
      setPreviewSummary(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const exportInvalidAndDuplicates = () => {
    if (!previewSummary) return;
    const invalidRows = previewSummary.rows
      .filter((r: any) => !r.isValidNumber || r.isDuplicateInBatch || r.isSuppressed)
      .map((r: any) => ({
        'Row Number': r.rowIndex,
        'Name': r.fullName,
        'Raw Mobile Number': r.rawMobile,
        'Validation Issue': r.validationError || 'Invalid',
        'Duplicate in File': r.isDuplicateInBatch ? 'YES' : 'NO',
        'On Suppression List': r.isSuppressed ? 'YES' : 'NO',
      }));

    if (invalidRows.length === 0) {
      alert('No invalid or duplicate rows to export!');
      return;
    }

    const csv = Papa.unparse(invalidRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Invalid_Duplicates_${fileName || 'contacts'}.csv`;
    link.click();
  };

  const filteredRows = previewSummary?.rows.filter((r: any) => {
    if (tableFilter === 'ELIGIBLE') return r.isEligibleForMarketing;
    if (tableFilter === 'PENDING') return r.consentStatus === 'PENDING_VERIFICATION' && r.isValidNumber && !r.isDuplicateInBatch && !r.isSuppressed;
    if (tableFilter === 'OPTED_OUT') return r.consentStatus === 'OPTED_OUT' || r.isSuppressed;
    if (tableFilter === 'INVALID') return !r.isValidNumber;
    if (tableFilter === 'DUPLICATE') return r.isDuplicateInBatch;
    return true;
  });

  return (
    <AppShell
      title="Bulk Contact Upload & Consent Validation"
      subtitle="Parse Excel/CSV, normalize E.164, verify consent evidence, and filter marketing eligibility"
    >
      {/* Download Sample & Upload Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#11131b] border border-[#232738] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Supported Columns
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#18202d] text-blue-400 border border-blue-500/20 font-mono">
              Auto-Detected Headers
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Standard Columns: <strong>Full Name, Mobile Number, Country Code, Email, Marketing Consent, Consent Source, Consent Date</strong>.
            Numbers are automatically converted to international standard E.164.
          </p>
        </div>

        <a
          href="/api/contacts/sample-template"
          download="SLRJ_DIGITAL_Contacts_Template.csv"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#181a24] hover:bg-[#202332] border border-[#2b3044] text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap self-start md:self-auto"
        >
          <Download className="h-3.5 w-3.5 text-[#25D366]" />
          <span>Download 7-Column CSV Template</span>
        </a>
      </div>

      {/* Compliance Notice Banner */}
      <div className="p-4 rounded-xl bg-[#131722] border border-blue-500/20 text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-[#25D366] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white block">WhatsApp Consent Governance Rule:</span>
          <span>
            Simply uploading a contact does <strong>NOT</strong> automatically mark them as opted in. 
            Contacts must have affirmative marketing consent (e.g. <code>YES</code>, <code>TRUE</code>, or <code>OPTED_IN</code>) with genuine consent source documentation to enter promotional campaigns. Unverified rows default to <strong>Pending Verification</strong>.
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Import Success Banner */}
      {importSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span>Contacts Successfully Imported into Database!</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-[#0e1c15] border border-emerald-500/20">
              <span className="text-slate-400 block">Imported New</span>
              <strong className="text-emerald-300 text-base font-mono">{importSuccess.importedCount}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0e1c15] border border-emerald-500/20">
              <span className="text-slate-400 block">Updated Existing</span>
              <strong className="text-emerald-300 text-base font-mono">{importSuccess.updatedCount}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0e1c15] border border-emerald-500/20">
              <span className="text-slate-400 block">Eligible for Marketing (Opted In)</span>
              <strong className="text-[#25D366] text-base font-mono">{importSuccess.eligibleOptedInCount}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0e1c15] border border-emerald-500/20">
              <span className="text-slate-400 block">Pending Verification</span>
              <strong className="text-amber-400 text-base font-mono">{importSuccess.pendingVerificationCount}</strong>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <a
              href="/campaigns/new"
              className="px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-black font-bold text-xs flex items-center gap-1.5"
            >
              <span>Launch Outreach Campaign</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => setImportSuccess(null)}
              className="px-4 py-2 rounded-lg bg-[#1a2e23] text-emerald-200 text-xs font-semibold"
            >
              Upload Another Batch
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      {!previewSummary && !importSuccess && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-[#25D366] bg-[#14231b]'
              : 'border-[#282d3e] bg-[#10121a] hover:border-[#383f58] hover:bg-[#131520]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="h-16 w-16 rounded-2xl bg-[#181c28] border border-[#2b3146] flex items-center justify-center mb-4 text-[#25D366]">
            {loading ? (
              <RefreshCw className="h-8 w-8 animate-spin" />
            ) : (
              <UploadCloud className="h-8 w-8" />
            )}
          </div>

          <h3 className="text-base font-bold text-white mb-1">
            {loading ? 'Analyzing columns and validating consent records...' : 'Drop your Excel or CSV file here, or click to browse'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            Supports .xlsx, .xls, and .csv formats. Automatically matches columns: Full Name, Mobile, Country Code, Email, Marketing Consent, Consent Source, and Consent Date.
          </p>

          <span className="px-4 py-2 rounded-lg bg-[#1a1e2b] text-slate-200 border border-[#2b3145] text-xs font-semibold hover:bg-[#23283a] transition-colors">
            Select Spreadsheet from Computer
          </span>
        </div>
      )}

      {/* Validation Summary & Preview Table */}
      {previewSummary && (
        <div className="space-y-6">
          {/* Summary Breakdown Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-[#11131b] border border-[#232738]">
              <span className="text-[11px] text-slate-400 block mb-1">Total in File</span>
              <div className="text-2xl font-black text-white font-mono">{previewSummary.totalRows}</div>
              <span className="text-[10px] text-slate-500 truncate block">{previewSummary.fileName}</span>
            </div>

            <div className="p-4 rounded-xl bg-[#11131b] border border-emerald-500/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-8 w-8 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
              <span className="text-[11px] text-emerald-300 block mb-1">Eligible Opted-In</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {previewSummary.eligibleOptedInCount}
              </div>
              <span className="text-[10px] text-emerald-400/80 font-medium">Valid + Verified Opt-In</span>
            </div>

            <div className="p-4 rounded-xl bg-[#11131b] border border-amber-500/30">
              <span className="text-[11px] text-amber-300 block mb-1">Pending Verification</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {previewSummary.pendingVerificationCount}
              </div>
              <span className="text-[10px] text-slate-400">Missing / Unverified Consent</span>
            </div>

            <div className="p-4 rounded-xl bg-[#11131b] border border-red-500/30">
              <span className="text-[11px] text-red-300 block mb-1">Opted Out / Suppressed</span>
              <div className="text-2xl font-black text-red-400 font-mono">
                {previewSummary.optedOutCount}
              </div>
              <span className="text-[10px] text-slate-500">Do Not Message</span>
            </div>

            <div className="p-4 rounded-xl bg-[#11131b] border border-[#232738]">
              <span className="text-[11px] text-slate-400 block mb-1">Duplicates / Invalid</span>
              <div className="text-2xl font-black text-slate-400 font-mono">
                {previewSummary.duplicateCount + previewSummary.invalidCount}
              </div>
              <span className="text-[10px] text-slate-500">Malformed or Duplicate</span>
            </div>
          </div>

          {/* Import Settings Bar */}
          <div className="p-4 rounded-xl bg-[#151822] border border-[#24293a] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Assign to Contact Group:
                </label>
                <input
                  type="text"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  placeholder="e.g. Q1 Marketing Prospects"
                  className="bg-[#1b1f2c] border border-[#2d3348] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#25D366] w-64"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 md:pt-4">
                <input
                  type="checkbox"
                  id="overrideConsent"
                  checked={overrideConsent}
                  onChange={(e) => setOverrideConsent(e.target.checked)}
                  className="rounded bg-[#1b1f2c] border-[#2d3348] text-[#25D366] focus:ring-0"
                />
                <label htmlFor="overrideConsent" className="text-xs text-slate-300 cursor-pointer">
                  Update consent status for existing contacts if provided in file
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportInvalidAndDuplicates}
                className="px-3 py-2 rounded-lg bg-[#1c202d] hover:bg-[#252a3b] border border-[#2e344a] text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-amber-400" />
                <span>Export Invalid / Duplicates</span>
              </button>

              <button
                type="button"
                disabled={importing}
                onClick={handleImportToDatabase}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba5a] hover:to-[#0f7569] text-white text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {importing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>
                  {importing ? 'Importing Contacts...' : `Import ${previewSummary.rows.filter((r: any) => r.selected).length} Contacts`}
                </span>
              </button>
            </div>
          </div>

          {/* Table Filters & Batch Selection */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium mr-1">Filter:</span>
              <button
                onClick={() => setTableFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  tableFilter === 'ALL'
                    ? 'bg-slate-200 text-black'
                    : 'bg-[#141622] text-slate-400 hover:text-white'
                }`}
              >
                All ({previewSummary.rows.length})
              </button>
              <button
                onClick={() => setTableFilter('ELIGIBLE')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  tableFilter === 'ELIGIBLE'
                    ? 'bg-[#25D366] text-black font-bold'
                    : 'bg-[#141622] text-emerald-400 hover:bg-[#192225]'
                }`}
              >
                Eligible Opted-In ({previewSummary.eligibleOptedInCount})
              </button>
              <button
                onClick={() => setTableFilter('PENDING')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  tableFilter === 'PENDING'
                    ? 'bg-amber-400 text-black font-bold'
                    : 'bg-[#141622] text-amber-400 hover:bg-[#252119]'
                }`}
              >
                Pending Consent ({previewSummary.pendingVerificationCount})
              </button>
              <button
                onClick={() => setTableFilter('OPTED_OUT')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  tableFilter === 'OPTED_OUT'
                    ? 'bg-red-500 text-white font-bold'
                    : 'bg-[#141622] text-red-400 hover:bg-[#251919]'
                }`}
              >
                Opted Out ({previewSummary.optedOutCount})
              </button>
              <button
                onClick={() => setTableFilter('DUPLICATE')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  tableFilter === 'DUPLICATE'
                    ? 'bg-slate-300 text-black font-bold'
                    : 'bg-[#141622] text-slate-400 hover:bg-[#202434]'
                }`}
              >
                Duplicates ({previewSummary.duplicateCount})
              </button>
              <button
                onClick={() => setTableFilter('INVALID')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  tableFilter === 'INVALID'
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-[#141622] text-red-400 hover:bg-[#251919]'
                }`}
              >
                Invalid ({previewSummary.invalidCount})
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => toggleSelectAll(true)}
                className="text-slate-400 hover:text-white underline cursor-pointer"
              >
                Select Valid
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={() => toggleSelectAll(false)}
                className="text-slate-400 hover:text-white underline cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Interactive Data Table */}
          <div className="rounded-xl border border-[#232738] bg-[#11131b] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161824] text-slate-400 border-b border-[#232738]">
                  <tr>
                    <th className="p-3 w-10">Select</th>
                    <th className="p-3">#</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Normalized Mobile (E.164)</th>
                    <th className="p-3">Email / Company</th>
                    <th className="p-3">Marketing Consent</th>
                    <th className="p-3">Consent Source & Date</th>
                    <th className="p-3">Campaign Eligibility</th>
                    <th className="p-3">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2232] text-slate-200">
                  {filteredRows.map((row: any, idx: number) => {
                    const originalIdx = previewSummary.rows.findIndex((r: any) => r.rowIndex === row.rowIndex);
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-[#161824] transition-colors ${
                          !row.isValidNumber || row.isDuplicateInBatch
                            ? 'bg-red-950/10'
                            : row.isEligibleForMarketing
                            ? 'bg-emerald-950/10'
                            : ''
                        }`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={!row.isValidNumber || row.isDuplicateInBatch || row.isSuppressed}
                            onChange={() => toggleSelectRow(originalIdx)}
                            className="rounded bg-[#1b1f2c] border-[#2d3348] text-[#25D366] focus:ring-0 disabled:opacity-30 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono text-slate-500">{row.rowIndex}</td>
                        <td className="p-3 font-semibold text-white">{row.fullName}</td>
                        <td className="p-3 font-mono font-medium">
                          {row.isValidNumber ? (
                            <span className="text-emerald-400">{row.normalizedMobile}</span>
                          ) : (
                            <span className="text-red-400 line-through">{row.rawMobile}</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300">
                          {row.email ? (
                            <div>
                              <span>{row.email}</span>
                              <span className="text-[10px] text-slate-500 block">{row.businessName || row.category}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">{row.businessName || '—'}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              row.consentStatus === 'OPTED_IN'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                                : row.consentStatus === 'OPTED_OUT'
                                ? 'bg-red-950/60 text-red-400 border border-red-500/30'
                                : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {row.consentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">
                          <span className="text-[11px] font-mono block text-slate-200">
                            {row.consentSource}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {row.consentDate ? new Date(row.consentDate).toLocaleDateString() : 'No date'}
                          </span>
                        </td>
                        <td className="p-3">
                          {row.isEligibleForMarketing ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Eligible</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-slate-500" />
                              <span>Not Eligible</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {row.validationError ? (
                            <span className="text-[11px] text-red-400 font-medium">{row.validationError}</span>
                          ) : row.isExistingInDb ? (
                            <span className="text-[11px] text-amber-400">Already in database</span>
                          ) : (
                            <span className="text-[11px] text-emerald-400/80">Valid & ready</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
