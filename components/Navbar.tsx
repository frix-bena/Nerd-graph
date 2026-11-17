'use client';

import React from 'react';
import { Activity, Sparkles } from 'lucide-react';

const MARKETS = [
  { symbol: 'XAUUSD', price: '2,342.80', change: '+0.42%' },
  { symbol: 'EURUSD', price: '1.08426', change: '+0.08%' },
  { symbol: 'NAS100', price: '18,642.5', change: '+0.31%' },
  { symbol: 'BTCUSD', price: '67,420.00', change: '−0.16%' },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#D4A373]/25 bg-[#0B0B0B]/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Apex Vision AI home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4A373]/40 bg-gradient-to-br from-[#5A341E] to-[#1E120C] text-[#D4A373]">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-sm font-black tracking-[0.12em] text-[#F5EBE6]">
            APEX <span className="text-[#D4A373]">VISION AI</span>
          </span>
        </a>

        <div className="hidden items-center gap-5 xl:flex">
          {MARKETS.map((market) => (
            <div key={market.symbol} className="leading-tight">
              <span className="mr-2 text-[10px] font-mono text-[#A8968D]">{market.symbol}</span>
              <span className="text-xs font-mono text-[#F5EBE6]">{market.price}</span>
              <span className={`ml-1.5 text-[10px] font-mono ${market.change.startsWith('+') ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{market.change}</span>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-2.5 py-2 text-[10px] font-mono text-[#10B981] sm:text-xs">
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">MT5 Bridge:</span> Ready
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 overflow-x-auto border-t border-[#D4A373]/10 px-4 py-2 xl:hidden sm:px-6">
        {MARKETS.map((market) => (
          <div key={market.symbol} className="flex shrink-0 items-center gap-1.5 text-[10px] font-mono">
            <span className="text-[#A8968D]">{market.symbol}</span>
            <span className="text-[#F5EBE6]">{market.price}</span>
            <span className={market.change.startsWith('+') ? 'text-[#10B981]' : 'text-[#EF4444]'}>{market.change}</span>
          </div>
        ))}
      </div>
    </header>
  );
}
