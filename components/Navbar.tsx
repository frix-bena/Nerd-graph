'use client';

import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  Layers,
  Terminal,
  Crown,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Zap,
} from 'lucide-react';

interface NavbarProps {
  onOpenDemo: () => void;
  onOpenMT5: () => void;
  onOpenPricing: () => void;
  mt5Connected: boolean;
  onToggleMT5: () => void;
  credits: number;
  tier: string;
}

export default function Navbar({
  onOpenDemo,
  onOpenMT5,
  onOpenPricing,
  mt5Connected,
  onToggleMT5,
  credits,
  tier,
}: NavbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0B0B0B]/90 backdrop-blur-md border-b border-[#D4A373]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#3D2314] to-[#1E120C] border border-[#D4A373]/40 shadow-card-lux">
            <span className="text-[#D4A373] font-mono text-xl font-black tracking-tighter">
              &Delta;
            </span>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#10B981] rounded-full ring-2 ring-[#0B0B0B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-wider text-[#F5EBE6]">
                APEX <span className="text-[#D4A373]">VISION</span> AI
              </span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-[#3D2314] text-[#D4A373] border border-[#D4A373]/30 rounded">
                SMC 2.0
              </span>
            </div>
            <p className="text-[11px] text-[#A8968D] tracking-wide hidden sm:block">
              Institutional Chart Vision & MT5 Execution Copilot
            </p>
          </div>
        </div>

        {/* Live System Status & MT5 Connection Badge */}
        <div className="hidden md:flex items-center gap-4">
          {/* AI Engine Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1E120C] border border-[#D4A373]/20 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
            </span>
            <span className="text-[#A8968D]">Vision Engine:</span>
            <span className="text-[#F5EBE6] font-medium">Online (0.2 temp)</span>
          </div>

          {/* MT5 Status Badge */}
          <button
            onClick={onOpenMT5}
            title="Click to configure MT5 connection & webhooks"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all duration-200 ${
              mt5Connected
                ? 'bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981]/20'
                : 'bg-[#EF4444]/10 border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/20'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>
              MT5: {mt5Connected ? 'CONNECTED #8920194' : 'DISCONNECTED'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
          </button>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Demo Video CTA */}
          <button
            onClick={onOpenDemo}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2A1810] hover:bg-[#3D2314] border border-[#D4A373]/30 text-xs font-medium text-[#F5EBE6] transition-all hover:border-[#D4A373]"
          >
            <PlayCircle className="w-4 h-4 text-[#D4A373] animate-pulse" />
            <span className="hidden sm:inline">Watch 60s Demo</span>
          </button>

          {/* User Profile / Tier Pill */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2A1810] to-[#1E120C] border border-[#D4A373]/30 hover:border-[#D4A373] transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-[#3D2314] border border-[#D4A373]/40 flex items-center justify-center text-[#D4A373]">
                <Crown className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-bold text-[#F5EBE6] flex items-center gap-1.5">
                  <span>{tier}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-[#D4A373]/20 text-[#D4A373] rounded">
                    {credits} SCAN
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#A8968D]" />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#1E120C] border border-[#D4A373]/30 shadow-2xl p-3 z-50">
                <div className="pb-3 border-b border-[#D4A373]/15">
                  <p className="text-xs font-bold text-[#F5EBE6]">
                    Apex Sovereign Trader
                  </p>
                  <p className="text-[11px] text-[#A8968D]">
                    trader@apexvisionai.io
                  </p>
                </div>

                <div className="py-2.5 space-y-1 text-xs">
                  <div className="flex justify-between py-1 text-[#A8968D]">
                    <span>Subscription Plan:</span>
                    <span className="text-[#D4A373] font-bold">{tier} TIER</span>
                  </div>
                  <div className="flex justify-between py-1 text-[#A8968D]">
                    <span>Vision Credits:</span>
                    <span className="text-[#10B981] font-mono font-bold">
                      {credits} Remaining
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-[#A8968D]">
                    <span>MT5 Terminal:</span>
                    <span className="text-[#F5EBE6]">MetaQuotes-Demo</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#D4A373]/15 space-y-1.5">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onOpenMT5();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#2A1810] hover:bg-[#3D2314] text-xs text-[#F5EBE6] border border-[#D4A373]/20 transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#D4A373]" />
                      MT5 Bridge Config
                    </span>
                    <span className="text-[10px] text-[#A8968D]">MQL5</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onOpenPricing();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg btn-bronze-gold text-xs font-semibold"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
                      Upgrade Plan
                    </span>
                    <span className="text-[10px] bg-[#D4A373] text-[#1E120C] font-bold px-1 rounded">
                      VIP
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
