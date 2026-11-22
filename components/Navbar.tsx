'use client';

import React, { useState } from 'react';
import { Radio, Sparkles } from 'lucide-react';
import GoLiveModal, { LiveConnectionStatus } from './GoLiveModal';

const MARKETS = [
  { symbol: 'XAUUSD', price: '2,652.40', change: '+0.42%' },
  { symbol: 'EURUSD', price: '1.08426', change: '+0.08%' },
  { symbol: 'NAS100', price: '18,642.5', change: '+0.31%' },
  { symbol: 'BTCUSD', price: '88,450.00', change: '−0.16%' },
];

export default function Navbar() {
  const [isGoLiveOpen, setIsGoLiveOpen] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveConnectionStatus>('Idle');

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-[#F8FAFC]/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-[68px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Apex Vision AI home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[#0F172A] bg-[#1D4ED8] text-white shadow-saas-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-[#0F172A]">
              APEX <span className="text-[#1D4ED8]">VISION AI</span>
            </span>
          </a>

          <div className="hidden items-center gap-6 xl:flex">
            {MARKETS.map((market) => (
              <div key={market.symbol} className="flex items-center gap-1.5 leading-tight">
                <span className="text-[11px] font-mono font-semibold text-[#475569]">{market.symbol}</span>
                <span className="text-xs font-mono font-bold text-[#0F172A]">{market.price}</span>
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    market.change.startsWith('+') ? 'text-[#1D4ED8]' : 'text-[#EF4444]'
                  }`}
                >
                  {market.change}
                </span>
              </div>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-[#1D4ED8]" />
              <span className="font-semibold text-[#1D4ED8]">MT5 Bridge</span>
              <span className="text-[#0F172A]">Ready</span>
            </div>

            <button
              type="button"
              onClick={() => setIsGoLiveOpen(true)}
              aria-label="Open Go Live Voice and Screen Trading Co-Pilot"
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold transition shadow-saas-sm ${
                isLiveConnected
                  ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white hover:bg-[#1E40AF]'
                  : 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#1D4ED8] hover:text-white'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                {isLiveConnected ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-90" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                  </>
                ) : (
                  <Radio className="h-3.5 w-3.5 -ml-0.5 -mt-0.5" />
                )}
              </span>
              <span>{isLiveConnected ? liveStatus : 'Go Live'}</span>
            </button>

            <a
              href="#workspace"
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#0F172A] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#1E293B]"
            >
              Open Workspace
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto border-t border-[#E2E8F0] bg-white/60 px-4 py-2 xl:hidden sm:px-6">
          {MARKETS.map((market) => (
            <div key={market.symbol} className="flex shrink-0 items-center gap-1.5 text-[11px] font-mono">
              <span className="font-medium text-[#475569]">{market.symbol}</span>
              <span className="font-bold text-[#0F172A]">{market.price}</span>
              <span className={market.change.startsWith('+') ? 'font-semibold text-[#1D4ED8]' : 'font-semibold text-[#EF4444]'}>
                {market.change}
              </span>
            </div>
          ))}
        </div>
      </header>

      <GoLiveModal
        isOpen={isGoLiveOpen}
        onClose={() => setIsGoLiveOpen(false)}
        onConnectionStateChange={(connected, currentStatus) => {
          setIsLiveConnected(connected);
          setLiveStatus(currentStatus);
        }}
      />
    </>
  );
}
