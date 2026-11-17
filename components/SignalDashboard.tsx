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
  Sparkles,
  RotateCcw,
  Activity,
  Compass,
  Code2,
  FileText,
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
  const [copiedJson, setCopiedJson] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const setupType =
    signal.trade_execution?.setup_type ||
    (signal.trade_recommendation === 'BUY'
      ? 'BUY SETUP'
      : signal.trade_recommendation === 'SELL'
      ? 'SELL SETUP'
      : 'NO TRADE');

  const isBuy = setupType === 'BUY SETUP' || signal.trade_recommendation === 'BUY';
  const isSell = setupType === 'SELL SETUP' || signal.trade_recommendation === 'SELL';
  const bias = signal.bias || signal.market_bias;
  const chartType = signal.chart_type || 'CANDLESTICK';
  const analysisMode =
    signal.analysis_mode ||
    (String(chartType).toUpperCase().includes('LINE')
      ? 'MACRO_PRICE_ACTION'
      : 'SMC_CANDLESTICK');

  const currentMarketPhase =
    signal.current_market_phase ||
    signal.market_mechanics_explanation?.current_market_phase ||
    signal.market_mechanics_explanation?.current_phase ||
    'Expansion';

  const whatIsHappening =
    signal.what_is_happening ||
    signal.market_mechanics_explanation?.what_is_happening ||
    signal.analysis_summary;

  const howItWorksSteps =
    (Array.isArray(signal.how_it_works_steps) && signal.how_it_works_steps.length > 0
      ? signal.how_it_works_steps
      : signal.market_mechanics_explanation?.how_it_works_steps ||
        signal.market_mechanics_explanation?.how_it_works_step_by_step) || [];

  const technicalSummary = signal.analysis_summary || whatIsHappening;
  const tools = signal.trading_tools_analysis;
  const rrr = signal.trade_execution?.risk_to_reward || signal.risk_reward_ratio;
  const invalidation =
    signal.trade_execution?.invalidation_condition || signal.invalidation_condition;

  const entryY =
    signal.entry_y ??
    signal.visual_proof_annotations?.entry_y ??
    signal.visual_proof_annotations?.entry_y_percent ??
    62;
  const stopLossY =
    signal.stop_loss_y ??
    signal.visual_proof_annotations?.stop_loss_y ??
    signal.visual_proof_annotations?.stop_loss_y_percent ??
    80;
  const tp1Y =
    signal.tp1_y ??
    signal.visual_proof_annotations?.tp1_y ??
    signal.visual_proof_annotations?.tp1_y_percent ??
    35;
  const tp2Y =
    signal.tp2_y ??
    signal.visual_proof_annotations?.tp2_y ??
    signal.visual_proof_annotations?.tp2_y_percent ??
    18;
  const zones = signal.zones || signal.visual_proof_annotations?.zones || [];
  const predictionPath =
    signal.prediction_path || signal.visual_proof_annotations?.prediction_path || [];

  const strictSchemaJson = {
    asset: signal.asset,
    timeframe: signal.timeframe,
    chart_type: chartType,
    analysis_mode: analysisMode,
    bias,
    confidence_score: signal.confidence_score,
    current_market_phase: currentMarketPhase,
    what_is_happening: whatIsHappening,
    how_it_works_steps: howItWorksSteps,
    entry_y: entryY,
    stop_loss_y: stopLossY,
    tp1_y: tp1Y,
    tp2_y: tp2Y,
    zones: zones.map((z) => ({
      x_start: z.x_start ?? z.x_start_percent,
      y_start: z.y_start ?? z.y_start_percent,
      x_end: z.x_end ?? z.x_end_percent,
      y_end: z.y_end ?? z.y_end_percent,
      label: z.label,
      type: z.type,
    })),
    prediction_path: predictionPath.map((pt) => ({
      x: pt.x ?? pt.x_percent,
      y: pt.y ?? pt.y_percent,
      label: pt.label ?? pt.note,
    })),
    market_mechanics_explanation: {
      current_market_phase: currentMarketPhase,
      current_phase: currentMarketPhase,
      what_is_happening: whatIsHappening,
      how_it_works_steps: howItWorksSteps,
      how_it_works_step_by_step: howItWorksSteps,
    },
    trading_tools_analysis: {
      market_structure: tools?.market_structure || 'N/A',
      liquidity_zones: tools?.liquidity_zones || 'N/A',
      imbalances_and_obs: tools?.imbalances_and_obs || 'N/A',
      fibonacci_or_session_context: tools?.fibonacci_or_session_context || 'N/A',
    },
    trade_execution: {
      setup_type: setupType,
      entry_price: signal.entry_price,
      stop_loss: signal.stop_loss,
      take_profit_1: signal.take_profit_1,
      take_profit_2: signal.take_profit_2,
      risk_to_reward: rrr,
      invalidation_condition: invalidation,
    },
    visual_proof_annotations: signal.visual_proof_annotations,
  };

  const copyPayload = () => {
    const payload = {
      action: 'ORDER_OPEN',
      symbol: signal.asset,
      side: signal.trade_recommendation,
      entry: signal.entry_price,
      stopLoss: signal.stop_loss,
      takeProfit1: signal.take_profit_1,
      takeProfit2: signal.take_profit_2,
      rrr,
      confidence: signal.confidence_score,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const copySchemaJson = () => {
    navigator.clipboard.writeText(JSON.stringify(strictSchemaJson, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner with Asset Badge, Bias, Current Market Phase, and Quick Actions */}
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
                  {setupType}
                </span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] border border-[#F59E0B] text-[#0F172A]">
                  Phase: {currentMarketPhase}
                </span>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8]">
                  {analysisMode === 'MACRO_PRICE_ACTION'
                    ? 'Macro Price Action & Trend Mode'
                    : 'Smart Money Concepts (SMC) Mode'}
                </span>
              </div>
              <p className="text-xs text-[#475569] mt-1">
                AI Vision Confidence:{' '}
                <span className="text-[#0F172A] font-bold font-mono">
                  {signal.confidence_score}%
                </span>{' '}
                • Institutional Bias:{' '}
                <span className="text-[#1D4ED8] font-bold">{bias}</span>
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
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="px-3 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-xs font-semibold text-[#0F172A] hover:text-[#1D4ED8] border border-[#CBD5E1] flex items-center justify-center gap-1.5 transition-all"
            >
              <Code2 className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>{showRawJson ? 'Hide JSON' : 'JSON Output'}</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-xs font-semibold text-[#0F172A] hover:text-[#1D4ED8] border border-[#CBD5E1] flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Scan Another</span>
            </button>

            {showExecutionControls && (
              <button
                type="button"
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

      {/* Optional Raw JSON Schema Drawer */}
      {showRawJson && (
        <div className="saas-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1D4ED8] flex items-center gap-1.5">
              <Code2 className="w-4 h-4" />
              <span>Strict Vision AI JSON Output</span>
            </span>
            <button
              type="button"
              onClick={copySchemaJson}
              className="px-3 py-1 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#93C5FD] text-xs font-mono font-bold text-[#1D4ED8] flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedJson ? '✓ Copied JSON' : 'Copy JSON'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-[#0F172A] text-[#EFF6FF] text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
            {JSON.stringify(strictSchemaJson, null, 2)}
          </pre>
        </div>
      )}

      {/* Split Layout: Chart View Side-by-Side with Institutional Mechanics & Tools Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chart with Normalized Coordinate Visual Proof Overlays + Technical Summary + Market Mechanics & How It Works */}
        <div className="lg:col-span-7 space-y-4">
          <InteractiveChartOverlay
            imageUrl={chartImage || signal.chartImageUrl || ''}
            signal={signal}
          />

          {/* 1. Vision AI Technical Summary */}
          <div className="saas-card rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F172A] font-mono">
                <FileText className="w-4 h-4 text-[#1D4ED8]" />
                <span>Vision AI Technical Summary</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#F8FAFC] border border-[#CBD5E1] text-[10px] font-mono font-bold text-[#475569]">
                {analysisMode === 'MACRO_PRICE_ACTION'
                  ? 'Line / Overlaid Chart Analysis'
                  : 'Candlestick SMC Analysis'}
              </span>
            </div>

            <p className="text-sm text-[#0F172A] leading-relaxed font-medium">
              {technicalSummary}
            </p>

            {signal.key_confluences?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {signal.key_confluences.map((confluence, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 text-xs text-[#0F172A]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0 mt-0.5" />
                    <span className="leading-snug font-medium">{confluence}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Dedicated "Market Mechanics & How It Works" Section right below Vision AI Technical Summary */}
          <div className="saas-card rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1D4ED8] font-mono">
                <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
                <span>Market Mechanics &amp; How It Works</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] border border-[#93C5FD] text-[11px] font-mono font-bold text-[#1D4ED8]">
                Phase: {currentMarketPhase}
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#475569]">
                What Is Happening Now
              </p>
              <p className="text-sm text-[#0F172A] leading-relaxed font-medium">
                {whatIsHappening}
              </p>
            </div>

            {howItWorksSteps.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#475569]">
                  How It Works — Step-by-Step Mechanism
                </p>
                {howItWorksSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#1D4ED8] text-white font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed text-[#0F172A] font-medium">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invalidation Condition Box */}
          <div className="rounded-2xl bg-[#FEF2F2] border border-[#FECACA] p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EF4444] mb-1.5 font-mono">
              <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
              <span>Structural Invalidation Condition</span>
            </div>
            <p className="text-xs text-[#0F172A] leading-relaxed font-mono">
              {invalidation}
            </p>
          </div>
        </div>

        {/* Right Column: Trade Execution & Trading Tools Analysis (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Trade Execution Levels Card */}
          <div className="saas-card rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-[#1D4ED8]" />
                Trade Execution ({setupType})
              </span>
              <span className="rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#1D4ED8]">
                R:R {rrr}
              </span>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-3">
              {[
                {
                  label: 'Entry Price',
                  value: signal.entry_price,
                  color: '#0F172A',
                  badge: '#F59E0B',
                  yPct: entryY,
                },
                {
                  label: 'Stop Loss',
                  value: signal.stop_loss,
                  color: '#EF4444',
                  badge: '#EF4444',
                  yPct: stopLossY,
                },
                {
                  label: 'Take Profit 1',
                  value: signal.take_profit_1,
                  color: '#1D4ED8',
                  badge: '#2563EB',
                  yPct: tp1Y,
                },
                {
                  label: 'Take Profit 2',
                  value: signal.take_profit_2,
                  color: '#1D4ED8',
                  badge: '#1D4ED8',
                  yPct: tp2Y,
                },
              ].map((level) => (
                <div
                  key={level.label}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: level.badge }}
                      />
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#475569]">
                        {level.label}
                      </p>
                    </div>
                    {typeof level.yPct === 'number' && (
                      <span className="text-[9px] font-mono text-[#475569]">
                        Y:{level.yPct}%
                      </span>
                    )}
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

          {/* Institutional Trading Tools Analysis Breakdown Card */}
          <div className="saas-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#0F172A] pb-2 border-b border-[#E2E8F0]">
              <Compass className="w-4 h-4 text-[#1D4ED8]" />
              <span>
                {analysisMode === 'MACRO_PRICE_ACTION'
                  ? 'Macro Price Action & Trend Structure'
                  : 'Institutional SMC Tools Analysis'}
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  title:
                    analysisMode === 'MACRO_PRICE_ACTION'
                      ? 'Swing Highs / Lows & Trend Structure'
                      : 'Market Structure (BOS / CHoCH)',
                  content: tools?.market_structure,
                },
                {
                  title:
                    analysisMode === 'MACRO_PRICE_ACTION'
                      ? 'Horizontal Support & Resistance Levels'
                      : 'Liquidity Zones (BSL / SSL)',
                  content: tools?.liquidity_zones,
                },
                {
                  title:
                    analysisMode === 'MACRO_PRICE_ACTION'
                      ? 'Supply / Demand Shelves & Flip Zones'
                      : 'Imbalances & Order Blocks (FVG / OB)',
                  content: tools?.imbalances_and_obs,
                },
                {
                  title:
                    analysisMode === 'MACRO_PRICE_ACTION'
                      ? 'Multi-Session Trajectory & Momentum'
                      : 'Fibonacci & Session Context',
                  content: tools?.fibonacci_or_session_context,
                },
              ].map(
                (item) =>
                  item.content && (
                    <div
                      key={item.title}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1"
                    >
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1D4ED8]">
                        {item.title}
                      </p>
                      <p className="text-xs leading-relaxed text-[#0F172A] font-medium">
                        {item.content}
                      </p>
                    </div>
                  )
              )}
            </div>
          </div>

          {/* Annotated Visual Proof Zones Summary */}
          {zones.length > 0 && (
            <div className="saas-card rounded-2xl p-5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#0F172A] mb-3">
                <Activity className="w-4 h-4 text-[#1D4ED8]" />
                <span>Mapped Chart Coordinates (0-100%)</span>
              </div>

              <div className="space-y-2">
                {zones.map((z, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] border border-[#93C5FD] text-[#1D4ED8] font-mono text-[10px] font-bold">
                        {z.type}
                      </span>
                      <span className="truncate font-medium text-[#0F172A]">
                        {z.label}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#475569] flex-shrink-0">
                      X:{z.x_start ?? z.x_start_percent}-{z.x_end ?? z.x_end_percent}% · Y:
                      {z.y_start ?? z.y_start_percent}-{z.y_end ?? z.y_end_percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MT5 Payload & Webhook Actions Bar */}
          {showExecutionControls && (
            <div className="saas-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={copyPayload}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-xs font-semibold text-[#0F172A] border border-[#CBD5E1] transition-all"
              >
                <Copy className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>{copiedPayload ? '✓ Payload Copied!' : 'Copy Webhook Payload'}</span>
              </button>

              <button
                type="button"
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
