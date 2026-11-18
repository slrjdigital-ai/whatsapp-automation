'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandLogo from './BrandLogo';
import {
  LayoutDashboard,
  UploadCloud,
  Users,
  UserCheck,
  Send,
  BarChart3,
  FileCode2,
  ShieldBan,
  Settings,
  ShieldAlert,
  Activity,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
  wabaStatus?: {
    isConnected: boolean;
    isDemoMode: boolean;
    qualityRating?: string;
  };
  onLogout?: () => void;
}

export default function Sidebar({ user, wabaStatus, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Upload Contacts', href: '/upload', icon: UploadCloud },
    { name: 'Contact Management', href: '/contacts', icon: Users },
    { name: 'Customer Opt-In Form', href: '/consent', icon: UserCheck },
    { name: 'Create Campaign', href: '/campaigns/new', icon: Send },
    { name: 'Campaign Analytics', href: '/campaigns', icon: BarChart3 },
    { name: 'Message Templates', href: '/templates', icon: FileCode2 },
    { name: 'Suppression & Opt-Outs', href: '/suppression', icon: ShieldBan },
    { name: 'WhatsApp API Settings', href: '/settings', icon: Settings },
    { name: 'Developer Diagnostics', href: '/diagnostics', icon: Activity },
    { name: 'Audit Trail & Security', href: '/audit', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0c0d12] border-r border-[#1e2230] flex flex-col min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1e2230]">
        <Link href="/">
          <BrandLogo size="md" />
        </Link>

        {/* WABA Cloud API Live Status Badge */}
        <div className="mt-4 px-3 py-2 rounded-lg bg-[#141722] border border-[#232738] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${wabaStatus?.isConnected ? 'bg-[#25D366]' : 'bg-amber-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${wabaStatus?.isConnected ? 'bg-[#25D366]' : 'bg-amber-400'}`} />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-slate-200 leading-tight">
                Meta Cloud API
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {wabaStatus?.isConnected ? 'Meta Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#1d2d25] text-[#25D366] border border-[#25D366]/30">
            {wabaStatus?.qualityRating || 'TIER 1K'}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Core Outreach
        </div>
        {navigation.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-slate-100/10 to-slate-100/5 text-white border border-slate-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141620]'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#25D366]' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <div className="pt-4 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          System & Governance
        </div>
        {navigation.slice(5).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-slate-100/10 to-slate-100/5 text-white border border-slate-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141620]'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#25D366]' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer Card */}
      <div className="p-3 border-t border-[#1e2230] bg-[#090a0e]">
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#12141c] border border-[#212433]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
              {user?.name ? user.name.slice(0, 2) : 'AD'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate">
                {user?.name || 'SLRJ Admin'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 truncate">
                {user?.role || 'SUPER_ADMIN'}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
