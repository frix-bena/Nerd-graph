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

  return (
    <div className="relative w-full rounded-2xl bg-white border border-[#CBD5E1] overflow-hidden shadow-saas-card group">
      {/* Chart Image */}
      <div className="relative w-full aspect-[16/10] bg-[#F8FAFC] flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Uploaded Financial Chart"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center p-8 text-[#475569]">
            <Layers className="w-12 h-12 mx-auto text-[#1D4ED8]/50 mb-2" />
            <p className="text-sm">No chart loaded</p>
          </div>
        )}

        {/* Visual SMC Interactive Level Overlays */}
        {showOverlays && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 z-10">
            {/* Take Profit 2 Line */}
            <div className="w-full flex items-center gap-2">
              <div className="h-[1.5px] flex-1 border-b-2 border-dashed border-[#1D4ED8]" />
              <span className="px-2.5 py-0.5 rounded-md bg-[#1D4ED8] border border-[#0F172A] text-white font-mono text-[11px] font-bold shadow-sm">
                TP2: {signal.take_profit_2.toLocaleString()}
              </span>
            </div>

            {/* Take Profit 1 Line */}
            <div className="w-full flex items-center gap-2">
              <div className="h-[1.5px] flex-1 border-b-2 border-dashed border-[#2563EB]" />
              <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] border border-[#1D4ED8] text-[#1D4ED8] font-mono text-[11px] font-bold shadow-sm">
                TP1: {signal.take_profit_1.toLocaleString()}
              </span>
            </div>

            {/* Entry Price Line */}
            <div className="w-full flex items-center gap-2">
              <div className="h-[2px] flex-1 bg-[#F59E0B]" />
              <span className="px-2.5 py-1 rounded-md bg-[#FEF3C7] border border-[#0F172A] text-[#0F172A] font-mono text-xs font-extrabold shadow-sm flex items-center gap-1.5">
                <Crosshair className="w-3 h-3 text-[#F59E0B]" />
                ENTRY: {signal.entry_price.toLocaleString()}
              </span>
            </div>

            {/* Stop Loss Line */}
            <div className="w-full flex items-center gap-2">
              <div className="h-[1.5px] flex-1 border-b-2 border-dashed border-[#EF4444]" />
              <span className="px-2.5 py-0.5 rounded-md bg-[#FEF2F2] border border-[#EF4444] text-[#EF4444] font-mono text-[11px] font-bold shadow-sm">
                SL: {signal.stop_loss.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Overlay Toolbar at Bottom of Chart */}
      <div className="px-4 py-2.5 bg-white border-t border-[#E2E8F0] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#1D4ED8]" />
          <span className="text-[#0F172A] font-bold">{signal.asset}</span>
          <span className="text-[#475569]">({signal.timeframe})</span>
          <span className="text-[#1D4ED8] font-bold hidden sm:inline">
            RRR: {signal.risk_reward_ratio}
          </span>
        </div>

        <button
          onClick={() => setShowOverlays(!showOverlays)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#475569] hover:text-[#1D4ED8] border border-[#CBD5E1] font-medium transition-all"
        >
          {showOverlays ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>Hide SMC Grid</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>Show SMC Grid</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
