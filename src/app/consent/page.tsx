'use client';

import React, { useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';

export default function CustomerConsentPage() {
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentAgreed) {
      setErrorMsg('Please review and check the marketing consent declaration below.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          countryCode,
          mobileNumber,
          email,
          businessName,
          consentAgreed,
          consentSource: 'WEBSITE_FORM',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit consent');
      }

      setSuccessData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting consent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080b] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden text-slate-100 font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#25D366]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-3">
            WhatsApp Marketing Consent Registration
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Stay ahead with exclusive digital marketing insights, web technology updates, and special agency offers from SLRJ DIGITAL.
          </p>
        </div>

        {/* Success Confirmation Card */}
        {successData ? (
          <div className="bg-[#11131b] border border-emerald-500/40 rounded-2xl p-8 shadow-2xl space-y-5 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center mx-auto text-[#25D366]">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Consent Verified & Registered!</h2>
              <p className="text-xs text-emerald-300">
                Thank you, <strong>{successData.contact?.fullName}</strong>. Your voluntary opt-in has been securely recorded.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#161925] border border-[#232738] text-xs text-slate-300 space-y-2 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Verified Mobile:</span>
                <span className="text-emerald-400 font-bold">{successData.contact?.mobileNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Consent Status:</span>
                <span className="text-emerald-400 font-bold">OPTED_IN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered At:</span>
                <span className="text-slate-300">{new Date(successData.contact?.consentDate).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131a17] border border-[#25D366]/30 text-xs text-slate-300 flex items-start gap-2.5 text-left">
              <MessageSquare className="h-4 w-4 text-[#25D366] flex-shrink-0 mt-0.5" />
              <span>
                <strong>Your Control Matters:</strong> You can opt out at any time by simply replying <strong>STOP</strong> to any WhatsApp message received from our verified business profile.
              </span>
            </div>

            <button
              onClick={() => {
                setSuccessData(null);
                setFullName('');
                setMobileNumber('');
                setEmail('');
                setBusinessName('');
                setConsentAgreed(false);
              }}
              className="text-xs text-slate-400 hover:text-white underline pt-2"
            >
              Submit another registration
            </button>
          </div>
        ) : (
          /* Opt-In Registration Form Card */
          <div className="bg-[#11131b] border border-[#232738] rounded-2xl p-7 shadow-2xl space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <Info className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#25D366] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp Mobile Number *
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-[#181a24] border border-[#2b3044] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#25D366] font-mono"
                  >
                    <option value="91">🇮🇳 +91 (India)</option>
                    <option value="1">🇺🇸 +1 (US/Canada)</option>
                    <option value="44">🇬🇧 +44 (UK)</option>
                    <option value="971">🇦🇪 +971 (UAE)</option>
                    <option value="65">🇸🇬 +65 (Singapore)</option>
                    <option value="61">🇦🇺 +61 (Australia)</option>
                  </select>
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="9876543210"
                    className="flex-1 bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#25D366] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#25D366]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Business / Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Tech"
                    className="w-full bg-[#181a24] border border-[#2b3044] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#25D366]"
                  />
                </div>
              </div>

              {/* Explicit Mandatory Marketing Consent Checkbox */}
              <div className="pt-2">
                <div className="p-4 rounded-xl bg-[#141722] border border-[#25D366]/30 space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="consentCheck"
                      checked={consentAgreed}
                      onChange={(e) => setConsentAgreed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded bg-[#181a24] border-[#2b3044] text-[#25D366] focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="consentCheck" className="text-xs text-slate-200 leading-relaxed cursor-pointer select-none">
                      <strong className="text-white block mb-0.5">Voluntary Marketing Consent Declaration:</strong>
                      I voluntarily agree to receive promotional updates, agency announcements, and marketing communications from <strong>SLRJ DIGITAL</strong> on WhatsApp at the mobile number provided above.
                    </label>
                  </div>

                  <div className="text-[11px] text-slate-400 pl-7 flex items-center justify-between border-t border-[#1e2334] pt-2">
                    <span>Reply <strong>STOP</strong> at any time to opt out.</span>
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-[#25D366] hover:underline"
                    >
                      Privacy Policy
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !consentAgreed}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20ba5a] hover:to-[#0f7569] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Recording Verified Opt-In...</span>
                ) : (
                  <>
                    <span>Confirm & Register WhatsApp Consent</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-[#25D366]" />
          <span>Meta WhatsApp Business Platform • GDPR & Anti-Spam Compliant</span>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-[#232738] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">SLRJ DIGITAL Privacy Policy & Opt-In Terms</h3>
            <div className="text-xs text-slate-300 space-y-2 max-h-60 overflow-y-auto leading-relaxed">
              <p>
                SLRJ DIGITAL is committed to protecting your privacy. By providing your mobile number, you consent to receive informational and promotional WhatsApp messages regarding our digital services, including website development, app development, and digital marketing.
              </p>
              <p>
                <strong>Unsubscribe at any time:</strong> You may revoke consent at any time by replying with the keyword <code>STOP</code> to any message received. Your number will be permanently added to our suppression list immediately.
              </p>
              <p>
                We never sell, rent, or share your contact information with unauthorized third parties.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#25D366] text-black text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
