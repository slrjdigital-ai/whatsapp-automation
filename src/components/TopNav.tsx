'use client';

import React from 'react';
import Link from 'next/link';
import { Send, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

interface TopNavProps {
  title: string;
  subtitle?: string;
  wabaStatus?: {
    isConnected: boolean;
    isDemoMode: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    qualityRating?: string;
  };
}

export default function TopNav({ title, subtitle, wabaStatus }: TopNavProps) {
  return (
    <header className="h-16 border-b border-[#1e2230] bg-[#0c0d12]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Official Sender Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131622] border border-[#23273a] text-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-[#25D366]" />
          <span className="text-slate-300 font-medium">
            Sender: <span className="text-white font-mono">{wabaStatus?.displayPhoneNumber || '+91 98765 43210'}</span>
          </span>
          {wabaStatus?.isDemoMode && (
            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-950/60 text-amber-400 border border-amber-500/30">
              DEMO SIMULATOR
            </span>
          )}
        </div>

        {/* Quick Launch Button */}
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba5a] hover:to-[#0f7569] text-white shadow-md shadow-emerald-950/40 transition-all active:scale-95"
        >
          <Send className="h-3.5 w-3.5" />
          <span>New Campaign</span>
        </Link>
      </div>
    </header>
  );
}
