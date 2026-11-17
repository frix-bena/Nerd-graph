'use client';

import React, { useState } from 'react';
import { SMCSignalOutput } from '@/lib/types';
import InteractiveChartOverlay from './InteractiveChartOverlay';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  Zap,
  CheckCircle2,
  Copy,
  Download,
  Terminal,
  Crosshair,
  BarChart2,
  Layers,
  Sparkles,
  Info,
  RotateCcw,
} from 'lucide-react';

interface SignalDashboardProps {
  signal: SMCSignalOutput;
  chartImage: string;
  onOpenMT5Modal: () => void;
  onReset: () => void;
  onExecuteNow: () => Promise<void>;
  isExecuting: boolean;
  executionSuccess: boolean;
  showExecutionControls?: boolean;
}

export default function SignalDashboard({
  signal,
  chartImage,
  onOpenMT5Modal,
  onReset,
  onExecuteNow,
  isExecuting,
  executionSuccess,
  showExecutionControls = true,
}: SignalDashboardProps) {
  const [copiedPayload, setCopiedPayload] = useState(false);

  const isBuy = signal.trade_recommendation === 'BUY';
  const isSell = signal.trade_recommendation === 'SELL';

  const copyPayload = () => {
    const payload = {
      action: 'ORDER_OPEN',
      symbol: signal.asset,
      side: signal.trade_recommendation,
      entry: signal.entry_price,
      stopLoss: signal.stop_loss,
      takeProfit1: signal.take_profit_1,
      takeProfit2: signal.take_profit_2,
      rrr: signal.risk_reward_ratio,
      confidence: signal.confidence_score,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner with Asset Badge, Bias, and Quick Actions */}
      <div className="rounded-2xl bg-gradient-to-r from-[#2A1810] via-[#1E120C] to-[#2A1810] border border-[#D4A373]/30 p-5 shadow-card-lux">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border font-black text-xl shadow-lg ${
                isBuy
                  ? 'bg-[#10B981]/15 border-[#10B981]/50 text-[#10B981]'
                  : isSell
                  ? 'bg-[#EF4444]/15 border-[#EF4444]/50 text-[#EF4444]'
                  : 'bg-[#D4A373]/15 border-[#D4A373]/50 text-[#D4A373]'
              }`}
            >
              {isBuy ? (
                <TrendingUp className="w-6 h-6" />
              ) : isSell ? (
                <TrendingDown className="w-6 h-6" />
              ) : (
                <BarChart2 className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#F5EBE6] tracking-tight">
                  {signal.asset}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#3D2314] text-[#D4A373] border border-[#D4A373]/30 font-bold">
                  {signal.timeframe}
                </span>
                <span
                  className={`text-xs font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                    isBuy
                      ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                      : isSell
                      ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]'
                      : 'bg-[#D4A373]/15 border-[#D4A373] text-[#D4A373]'
                  }`}
                >
                  {signal.trade_recommendation} SETUP
                </span>
              </div>
              <p className="text-xs text-[#A8968D] mt-0.5">
                AI Vision Confidence:{' '}
                <span className="text-[#F5EBE6] font-bold font-mono">
                  {signal.confidence_score}%
                </span>{' '}
                • Market Bias:{' '}
                <span className="text-[#D4A373] font-bold">
                  {signal.market_bias}
                </span>
              </p>
              <div className="mt-2 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-[#150C07]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#5A341E] to-[#10B981]" style={{ width: `${Math.min(100, Math.max(0, signal.confidence_score))}%` }} />
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onReset}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[#2A1810] hover:bg-[#3D2314] text-xs font-semibold text-[#A8968D] hover:text-[#F5EBE6] border border-[#D4A373]/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Scan Another</span>
            </button>

            {showExecutionControls && <button
              onClick={onExecuteNow}
              disabled={isExecuting}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                executionSuccess
                  ? 'bg-[#10B981] text-black font-black'
                  : 'btn-bronze-gold'
              }`}
            >
              {isExecuting ? (
                <>
                  <Zap className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitting...</span>
                </>
              ) : executionSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Executed on MT5!</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-[#D4A373]" />
                  <span>Execute on MT5</span>
                </>
              )}
            </button>}
          </div>
        </div>
      </div>

      {/* Split Layout: Chart View Side-by-Side with AI Analysis Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chart with SMC Overlays (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <InteractiveChartOverlay imageUrl={chartImage} signal={signal} />

          {/* Analysis Summary Box */}
          <div className="rounded-2xl bg-[#1E120C] border border-[#D4A373]/20 p-5 shadow-card-lux">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D4A373] mb-2 font-mono">
              <Sparkles className="w-4 h-4 text-[#D4A373]" />
              <span>Vision AI Technical Summary</span>
            </div>
            <p className="text-sm text-[#F5EBE6] leading-relaxed">
              {signal.analysis_summary}
            </p>
          </div>

          {/* Invalidation Condition Box */}
          <div className="rounded-2xl bg-[#2A1810]/70 border border-[#EF4444]/30 p-4 shadow-card-lux">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EF4444] mb-1.5 font-mono">
              <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
              <span>Invalidation Condition</span>
            </div>
            <p className="text-xs text-[#F5EBE6]/90 leading-relaxed font-mono">
              {signal.invalidation_condition}
            </p>
          </div>
        </div>

        {/* Right Column: Key Metric Cards & Trade Setup Breakdown (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#2A1810] to-[#1E120C] border border-[#D4A373]/30 p-4 shadow-card-lux">
            <div className="flex items-center justify-between pb-2 border-b border-[#D4A373]/15">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D4A373] flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-[#D4A373]" />
                Trade execution levels
              </span>
              <span className="rounded-lg border border-[#D4A373]/30 bg-[#3D2314] px-2.5 py-1 text-[11px] font-mono font-bold text-[#D4A373]">
                R:R {signal.risk_reward_ratio}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {[
                { label: 'Entry Price', value: signal.entry_price, color: '#D4A373' },
                { label: 'Stop Loss', value: signal.stop_loss, color: '#EF4444' },
                { label: 'Take Profit 1', value: signal.take_profit_1, color: '#34D399' },
                { label: 'Take Profit 2', value: signal.take_profit_2, color: '#10B981' },
              ].map((level) => (
                <div key={level.label} className="rounded-xl border border-[#D4A373]/15 bg-[#150C07] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#A8968D]">{level.label}</p>
                  <p className="mt-1 font-mono text-base font-black" style={{ color: level.color }}>{level.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Confluences Breakdown Card */}
          <div className="rounded-2xl bg-[#1E120C] border border-[#D4A373]/20 p-5 shadow-card-lux">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#D4A373] mb-3">
              <Layers className="w-4 h-4 text-[#D4A373]" />
              <span>Smart Money Confluences (SMC)</span>
            </div>

            <div className="space-y-2.5">
              {signal.key_confluences?.map((conf, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#2A1810]/60 border border-[#D4A373]/15 text-xs text-[#F5EBE6]"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{conf}</span>
                </div>
              ))}
            </div>
          </div>

          {/* MT5 Payload & Webhook Actions Bar */}
          {showExecutionControls && <div className="p-4 rounded-2xl bg-[#1E120C] border border-[#D4A373]/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={copyPayload}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#2A1810] hover:bg-[#3D2314] text-xs font-medium text-[#F5EBE6] border border-[#D4A373]/25 transition-all"
            >
              <Copy className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>{copiedPayload ? '✓ Payload Copied!' : 'Copy Webhook Payload'}</span>
            </button>

            <button
              onClick={onOpenMT5Modal}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl btn-bronze-gold text-xs font-bold shadow transition-all"
            >
              <Terminal className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>MT5 EA & Webhook Setup</span>
            </button>
          </div>}
        </div>
      </div>
    </div>
  );
}
