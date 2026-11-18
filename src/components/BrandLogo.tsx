'use client';

import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export default function BrandLogo({ className = '', size = 'md', showSubtitle = true }: BrandLogoProps) {
  const iconSizes = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Premium Metallic Monogram Icon */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl font-black tracking-tighter text-white select-none shadow-lg`}
        style={{
          background: 'linear-gradient(135deg, #1e2029 0%, #0d0f14 50%, #151821 100%)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
        }}
      >
        <span className="bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent font-extrabold tracking-wider">
          SLRJ
        </span>
        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#25D366] border-2 border-[#0d0f14]" />
      </div>

      <div>
        <div className={`font-black tracking-wider leading-none text-white ${titleSizes[size]}`}>
          SLRJ <span className="text-slate-400 font-medium">DIGITAL</span>
        </div>
        {showSubtitle && (
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mt-1">
            WhatsApp Outreach Engine
          </div>
        )}
      </div>
    </div>
  );
}
