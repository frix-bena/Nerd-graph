'use client';

import React, { useState } from 'react';
import { SMCSignalOutput } from '@/lib/types';
import { Eye, EyeOff, Layers, Crosshair } from 'lucide-react';

interface InteractiveChartOverlayProps {
  imageUrl: string;
  signal: SMCSignalOutput;
}

export default function InteractiveChartOverlay({
  imageUrl,
  signal,
}: InteractiveChartOverlayProps) {
  const [showOverlays, setShowOverlays] = useState(true);
  const isBuy = signal.trade_recommendation === 'BUY';

  return (
    <div className="relative w-full rounded-2xl bg-[#0E0805] border border-[#D4A373]/30 overflow-hidden shadow-2xl group">
      {/* Chart Image */}
      <div className="relative w-full aspect-[16/10] bg-black/90 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Uploaded Financial Chart"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center p-8 text-[#A8968D]">
            <Layers className="w-12 h-12 mx-auto text-[#D4A373]/50 mb-2" />
            <p className="text-sm">No chart loaded</p>
          </div>
        )}

        {/* Visual SMC Interactive Level Overlays */}
        {showOverlays && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 z-10">
            {/* Take Profit 2 Line */}
            <div className="w-full flex items-center gap-2">
              <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[#10B981] to-[#10B981] border-b border-dashed border-[#10B981]" />
              <span className="px-2 py-0.5 rounded bg-[#10B981]/20 border border-[#10B981] text-[#10B981] font-mono text-[11px] font-bold shadow-bullish-glow">
                TP2: {signal.take_profit_2.toLocaleString()}
              </span>
            </div>

            {/* Take Profit 1 Line */}
            <div className="w-full flex items-center gap-2">
              <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[#34D399] to-[#34D399] border-b border-dashed border-[#34D399]" />
              <span className="px-2 py-0.5 rounded bg-[#34D399]/20 border border-[#34D399] text-[#34D399] font-mono text-[11px] font-bold">
                TP1: {signal.take_profit_1.toLocaleString()}
              </span>
            </div>

            {/* Entry Price Line */}
            <div className="w-full flex items-center gap-2">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-[#D4A373]/20 via-[#D4A373] to-[#D4A373] shadow-[0_0_10px_#D4A373]" />
              <span className="px-2.5 py-1 rounded bg-[#3D2314] border border-[#D4A373] text-[#F5EBE6] font-mono text-xs font-black shadow-gold-glow flex items-center gap-1.5">
                <Crosshair className="w-3 h-3 text-[#D4A373]" />
                ENTRY: {signal.entry_price.toLocaleString()}
              </span>
            </div>

            {/* Stop Loss Line */}
            <div className="w-full flex items-center gap-2">
              <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[#EF4444] to-[#EF4444] border-b border-dashed border-[#EF4444]" />
              <span className="px-2 py-0.5 rounded bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444] font-mono text-[11px] font-bold shadow-bearish-glow">
                SL: {signal.stop_loss.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Overlay Toolbar at Bottom of Chart */}
      <div className="px-4 py-2.5 bg-[#1E120C]/90 border-t border-[#D4A373]/20 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[#F5EBE6] font-bold">{signal.asset}</span>
          <span className="text-[#A8968D]">({signal.timeframe})</span>
          <span className="text-[#D4A373] font-bold hidden sm:inline">
            RRR: {signal.risk_reward_ratio}
          </span>
        </div>

        <button
          onClick={() => setShowOverlays(!showOverlays)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2A1810] hover:bg-[#3D2314] text-[#A8968D] hover:text-[#F5EBE6] border border-[#D4A373]/20 transition-all"
        >
          {showOverlays ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>Hide SMC Grid</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>Show SMC Grid</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
