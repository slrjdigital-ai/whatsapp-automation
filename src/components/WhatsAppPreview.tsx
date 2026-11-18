'use client';

import React from 'react';
import { CheckCheck, Phone, Video, MoreVertical, ExternalLink, CornerDownLeft, ShieldCheck } from 'lucide-react';

interface WhatsAppPreviewProps {
  headerType?: string;
  headerContent?: string | null;
  bodyText: string;
  footerText?: string | null;
  buttons?: Array<{ type: string; text: string; url?: string }>;
  sampleName?: string;
}

export default function WhatsAppPreview({
  headerType = 'TEXT',
  headerContent,
  bodyText,
  footerText,
  buttons = [],
  sampleName = 'Rahul Sharma',
}: WhatsAppPreviewProps) {
  // Replace variable placeholders
  const renderedBody = bodyText
    ? bodyText
        .replace(/\{\{name\}\}/gi, sampleName)
        .replace(/\{\{business_name\}\}/gi, 'Acme Retail')
    : 'Message preview will appear here...';

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-[340px] rounded-[36px] bg-[#11131a] p-3 shadow-2xl border-4 border-[#2c3040] select-none">
      {/* Smartphone Notch / Top Bezel */}
      <div className="flex justify-between items-center px-4 py-1.5 text-[11px] text-slate-400 font-medium">
        <span>{currentTime}</span>
        <div className="h-4 w-20 rounded-full bg-black/80 flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-700 mr-2" />
          <div className="h-2 w-2 rounded-full bg-slate-900 border border-slate-700" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>5G</span>
        </div>
      </div>

      {/* Screen Frame */}
      <div className="rounded-[28px] overflow-hidden bg-[#0c1317] border border-[#1e2330] flex flex-col h-[560px]">
        {/* WhatsApp Chat Header */}
        <div className="bg-[#1f2c34] px-3 py-2.5 flex items-center justify-between text-slate-100 border-b border-[#2a3942]">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 border border-slate-500 flex items-center justify-center font-bold text-xs text-white">
                SLRJ
              </div>
              <ShieldCheck className="h-3.5 w-3.5 text-[#25D366] fill-[#25D366] absolute -bottom-0.5 -right-0.5 bg-[#1f2c34] rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold leading-tight text-white">SLRJ DIGITAL</span>
                <span className="text-[10px] text-[#25D366] font-bold">✓</span>
              </div>
              <span className="text-[10px] text-slate-400 leading-tight">Official Business Account</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-300">
            <Video className="h-4 w-4" />
            <Phone className="h-3.5 w-3.5" />
            <MoreVertical className="h-4 w-4" />
          </div>
        </div>

        {/* WhatsApp Chat Wallpaper Area */}
        <div
          className="flex-1 p-3 overflow-y-auto space-y-2 flex flex-col justify-end"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(30, 42, 50, 0.4) 0%, rgba(12, 19, 23, 0.95) 100%)',
          }}
        >
          {/* Encryption Note Pill */}
          <div className="mx-auto px-2.5 py-1 rounded-md bg-[#182229] border border-[#233138] text-[9px] text-[#ffd279] text-center max-w-[260px] leading-relaxed shadow-sm">
            🔒 Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.
          </div>

          {/* Outbound WhatsApp Message Bubble */}
          <div className="max-w-[88%] self-end bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none p-2.5 text-xs shadow-md border border-[#02735e]/40 space-y-2">
            {/* Header */}
            {headerContent && (
              <div className="font-bold text-white text-[13px] border-b border-[#147a67] pb-1">
                {headerContent}
              </div>
            )}

            {/* Body */}
            <div className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-100">
              {renderedBody}
            </div>

            {/* Footer */}
            {footerText && (
              <div className="text-[9px] text-emerald-200/80 pt-1 border-t border-[#147a67]">
                {footerText}
              </div>
            )}

            {/* Timestamp & Double Blue Ticks */}
            <div className="flex items-center justify-end gap-1 pt-0.5 text-[9px] text-emerald-300/80">
              <span>{currentTime}</span>
              <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
            </div>
          </div>

          {/* Action Buttons (Quick Replies & URLs) */}
          {buttons && buttons.length > 0 && (
            <div className="self-end max-w-[88%] w-full space-y-1">
              {buttons.map((btn, i) => (
                <div
                  key={i}
                  className="bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] py-1.5 px-3 rounded-md text-center text-xs font-medium border border-[#2f3f4a] flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {btn.type === 'URL' ? (
                    <ExternalLink className="h-3 w-3" />
                  ) : (
                    <CornerDownLeft className="h-3 w-3" />
                  )}
                  <span>{btn.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp Fake Chat Input Area */}
        <div className="bg-[#1f2c34] p-2 flex items-center gap-2 border-t border-[#2a3942]">
          <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[11px] text-slate-400">
            Type a message...
          </div>
          <div className="h-7 w-7 rounded-full bg-[#00a884] flex items-center justify-center text-white text-xs">
            🎙️
          </div>
        </div>
      </div>
    </div>
  );
}
