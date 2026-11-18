'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AppShell({ children, title, subtitle }: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [wabaStatus, setWabaStatus] = useState<any>({
    isConnected: true,
    isDemoMode: true,
    displayPhoneNumber: '+91 84669 74408',
    verifiedName: 'SLRJ DIGITAL',
    qualityRating: 'GREEN',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuthAndStatus() {
      try {
        const [meRes, configRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/whatsapp/config'),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.authenticated && meData.user) {
            setUser(meData.user);
          }
        }

        if (configRes.ok) {
          const configData = await configRes.json();
          if (configData.config) {
            setWabaStatus(configData.config);
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndStatus();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#08090d] text-slate-100 font-sans selection:bg-[#25D366]/30 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar user={user} wabaStatus={wabaStatus} onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopNav title={title} subtitle={subtitle} wabaStatus={wabaStatus} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
