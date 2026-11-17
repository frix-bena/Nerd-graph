'use client';

import React, { useState } from 'react';
import { SMCSignalOutput } from '@/lib/types';
import InteractiveChartOverlay from './InteractiveChartOverlay';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Copy,
  Terminal,
  Crosshair,
  BarChart2,
  Layers,
  Sparkles,
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
      <div className="saas-card rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 font-black text-xl ${
                isBuy
                  ? 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]'
                  : isSell
                  ? 'bg-[#FEF2F2] border-[#EF4444] text-[#EF4444]'
                  : 'bg-[#FEF3C7] border-[#F59E0B] text-[#0F172A]'
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
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
                  {signal.asset}
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] font-bold">
                  {signal.timeframe}
                </span>
                <span
                  className={`text-xs font-bold tracking-wider px-3 py-0.5 rounded-full border ${
                    isBuy
                      ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#1D4ED8]'
                      : isSell
                      ? 'bg-[#FEF2F2] border-[#FECACA] text-[#EF4444]'
                      : 'bg-[#FEF3C7] border-[#FDE68A] text-[#0F172A]'
                  }`}
                >
                  {signal.trade_recommendation} SETUP
                </span>
              </div>
              <p className="text-xs text-[#475569] mt-1">
                AI Vision Confidence:{' '}
                <span className="text-[#0F172A] font-bold font-mono">
                  {signal.confidence_score}%
                </span>{' '}
                • Market Bias:{' '}
                <span className="text-[#1D4ED8] font-bold">
                  {signal.market_bias}
                </span>
              </p>
              <div className="mt-2 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                <div
                  className="h-full rounded-full bg-[#1D4ED8]"
                  style={{ width: `${Math.min(100, Math.max(0, signal.confidence_score))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onReset}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-xs font-semibold text-[#0F172A] hover:text-[#1D4ED8] border border-[#CBD5E1] flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Scan Another</span>
            </button>

            {showExecutionControls && (
              <button
                onClick={onExecuteNow}
                disabled={isExecuting}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  executionSuccess
                    ? 'bg-[#10B981] text-white font-black'
                    : 'btn-royal-primary'
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
                    <Zap className="w-3.5 h-3.5 text-white" />
                    <span>Execute on MT5</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Split Layout: Chart View Side-by-Side with AI Analysis Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chart with SMC Overlays (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <InteractiveChartOverlay imageUrl={chartImage} signal={signal} />

          {/* Analysis Summary Box */}
          <div className="saas-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1D4ED8] mb-2 font-mono">
              <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
              <span>Vision AI Technical Summary</span>
            </div>
            <p className="text-sm text-[#475569] leading-relaxed">
              {signal.analysis_summary}
            </p>
          </div>

          {/* Invalidation Condition Box */}
          <div className="rounded-2xl bg-[#FEF2F2] border border-[#FECACA] p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EF4444] mb-1.5 font-mono">
              <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
              <span>Invalidation Condition</span>
            </div>
            <p className="text-xs text-[#0F172A] leading-relaxed font-mono">
              {signal.invalidation_condition}
            </p>
          </div>
        </div>

        {/* Right Column: Key Metric Cards & Trade Setup Breakdown (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="saas-card rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-[#1D4ED8]" />
                Trade execution levels
              </span>
              <span className="rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#1D4ED8]">
                R:R {signal.risk_reward_ratio}
              </span>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-3">
              {[
                { label: 'Entry Price', value: signal.entry_price, color: '#0F172A', badge: '#F59E0B' },
                { label: 'Stop Loss', value: signal.stop_loss, color: '#EF4444', badge: '#EF4444' },
                { label: 'Take Profit 1', value: signal.take_profit_1, color: '#1D4ED8', badge: '#2563EB' },
                { label: 'Take Profit 2', value: signal.take_profit_2, color: '#1D4ED8', badge: '#1D4ED8' },
              ].map((level) => (
                <div
                  key={level.label}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: level.badge }}
                    />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#475569]">
                      {level.label}
                    </p>
                  </div>
                  <p
                    className="mt-1 font-mono text-base font-extrabold"
                    style={{ color: level.color }}
                  >
                    {level.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Confluences Breakdown Card */}
          <div className="saas-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#0F172A] mb-3">
              <Layers className="w-4 h-4 text-[#1D4ED8]" />
              <span>Smart Money Confluences (SMC)</span>
            </div>

            <div className="space-y-2.5">
              {signal.key_confluences?.map((conf, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A]"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#1D4ED8] flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed text-[#475569] font-medium">{conf}</span>
                </div>
              ))}
            </div>
          </div>

          {/* MT5 Payload & Webhook Actions Bar */}
          {showExecutionControls && (
            <div className="saas-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={copyPayload}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-xs font-semibold text-[#0F172A] border border-[#CBD5E1] transition-all"
              >
                <Copy className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>{copiedPayload ? '✓ Payload Copied!' : 'Copy Webhook Payload'}</span>
              </button>

              <button
                onClick={onOpenMT5Modal}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg btn-royal-primary text-xs font-bold transition-all"
              >
                <Terminal className="w-3.5 h-3.5 text-white" />
                <span>MT5 EA &amp; Webhook Setup</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
