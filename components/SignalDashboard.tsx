'use client';

import React, { useState } from 'react';
import { SMCSignalOutput, formatSignalPrice } from '@/lib/types';
import InteractiveChartOverlay from './InteractiveChartOverlay';
import MultiTimeframeProjectionChart from './MultiTimeframeProjectionChart';
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
  const [copiedLevels, setCopiedLevels] = useState(false);

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

  const entryPriceNum = Number(signal.entry_price || signal.trade_execution?.entry_price || 0);
  const stopLossNum = Number(signal.stop_loss || signal.trade_execution?.stop_loss || 0);
  const tp1Num = Number(signal.take_profit_1 || signal.trade_execution?.take_profit_1 || 0);
  const tp2Num = Number(signal.take_profit_2 || signal.trade_execution?.take_profit_2 || 0);
  const rawTp3Num = Number(signal.take_profit_3 ?? signal.trade_execution?.take_profit_3 ?? 0);
  const riskDist = entryPriceNum > 0 && stopLossNum > 0 ? Math.abs(entryPriceNum - stopLossNum) : 0;
  const tp3Num =
    rawTp3Num > 0
      ? rawTp3Num
      : tp2Num > 0 && tp1Num > 0
      ? isSell
        ? Math.max(0.0001, Number((tp2Num - Math.abs(tp2Num - tp1Num)).toFixed(5)))
        : Number((tp2Num + Math.abs(tp2Num - tp1Num)).toFixed(5))
      : 0;

  const calcRR = (tp: number) =>
    riskDist > 0 && tp > 0 && entryPriceNum > 0
      ? `1:${Math.abs((tp - entryPriceNum) / riskDist).toFixed(2)}`
      : null;

  const rrTp1 = calcRR(tp1Num) || signal.trade_execution?.risk_to_reward || signal.risk_reward_ratio;
  const rrTp2 = calcRR(tp2Num);
  const rrTp3 = calcRR(tp3Num);

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
  const tp3Y =
    signal.tp3_y ??
    signal.visual_proof_annotations?.tp3_y ??
    signal.visual_proof_annotations?.tp3_y_percent ??
    (isBuy ? 10 : 90);
  const zones = signal.zones || signal.visual_proof_annotations?.zones || [];

  const copyTradeLevelsText = () => {
    const text = [
      `${signal.asset} (${signal.timeframe}) — ${setupType}`,
      `Entry Price: ${formatSignalPrice(entryPriceNum, signal.asset)}`,
      `Stop Loss (SL): ${formatSignalPrice(stopLossNum, signal.asset)}`,
      `Take Profit 1 (TP1): ${formatSignalPrice(tp1Num, signal.asset)}${rrTp1 ? ` (${rrTp1})` : ''}`,
      `Take Profit 2 (TP2): ${formatSignalPrice(tp2Num, signal.asset)}${rrTp2 ? ` (${rrTp2})` : ''}`,
      ...(tp3Num > 0
        ? [
            `Take Profit 3 (TP3): ${formatSignalPrice(tp3Num, signal.asset)}${
              rrTp3 ? ` (${rrTp3})` : ''
            }`,
          ]
        : []),
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLevels(true);
    setTimeout(() => setCopiedLevels(false), 2200);
  };

  const copyPayload = () => {
    const payload = {
      action: 'ORDER_OPEN',
      symbol: signal.asset,
      timeframe: signal.timeframe,
      side: signal.trade_recommendation,
      entry: entryPriceNum,
      stopLoss: stopLossNum,
      takeProfit1: tp1Num,
      takeProfit2: tp2Num,
      takeProfit3: tp3Num,
      rrr,
      confidence: signal.confidence_score,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
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
                {signal.accuracy_verification?.is_verified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#EFF6FF] border border-[#1D4ED8] text-[#1D4ED8]">
                    <CheckCircle2 className="w-3 h-3 text-[#1D4ED8]" />
                    <span>Geometry &amp; R:R Verified</span>
                  </span>
                )}
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
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={copyTradeLevelsText}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-xs font-bold text-[#1D4ED8] border border-[#93C5FD] flex items-center justify-center gap-1.5 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedLevels ? '✓ Levels Copied!' : 'Copy Entry / SL / TP'}</span>
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

        {/* Prominent Agent Execution Levels Bar (Entry Price, Stop Loss, Take Profit 1, Take Profit 2, Take Profit 3) */}
        <div className="mt-5 pt-4 border-t border-[#E2E8F0]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#0F172A]">
              <Crosshair className="w-4 h-4 text-[#1D4ED8]" />
              <span>Agent Analysed Trade Levels — Entry, Stop Loss &amp; Take Profits</span>
            </div>
            <span className="rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#1D4ED8]">
              Primary R:R {rrr}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* Entry Price */}
            <div className="min-w-0 break-words rounded-xl border-2 border-[#F59E0B] bg-[#FEF3C7]/45 p-3">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0F172A]">
                  Entry Price
                </span>
                <span className="rounded bg-[#F59E0B] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#0F172A]">
                  {isBuy ? 'BUY' : isSell ? 'SELL' : 'ENTRY'}
                </span>
              </div>
              <p className="mt-1 font-mono text-base sm:text-lg font-extrabold text-[#0F172A] break-words">
                {formatSignalPrice(entryPriceNum, signal.asset)}
              </p>
              <p className="mt-0.5 text-[10px] font-mono text-[#475569] break-words">
                Institutional Execution Zone
              </p>
            </div>

            {/* Stop Loss */}
            <div className="min-w-0 break-words rounded-xl border-2 border-[#EF4444] bg-[#FEF2F2] p-3">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#EF4444]">
                  Stop Loss (SL)
                </span>
                <span className="rounded bg-[#EF4444] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                  0.8x-1.5x ATR
                </span>
              </div>
              <p className="mt-1 font-mono text-base sm:text-lg font-extrabold text-[#EF4444] break-words">
                {formatSignalPrice(stopLossNum, signal.asset)}
              </p>
              <p className="mt-0.5 text-[10px] font-mono text-[#475569] break-words">
                Tight Micro-Swing SL
              </p>
            </div>

            {/* Take Profit 1 */}
            <div className="min-w-0 break-words rounded-xl border border-[#93C5FD] bg-[#EFF6FF] p-3">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1D4ED8]">
                  Take Profit 1
                </span>
                {rrTp1 && (
                  <span className="rounded bg-[#1D4ED8]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#1D4ED8]">
                    {rrTp1}
                  </span>
                )}
              </div>
              <p className="mt-1 font-mono text-base sm:text-lg font-extrabold text-[#1D4ED8] break-words">
                {formatSignalPrice(tp1Num, signal.asset)}
              </p>
              <p className="mt-0.5 text-[10px] font-mono text-[#475569] break-words">
                Internal Liquidity Target
              </p>
            </div>

            {/* Take Profit 2 */}
            <div className="min-w-0 break-words rounded-xl border border-[#1D4ED8] bg-[#EFF6FF] p-3">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1D4ED8]">
                  Take Profit 2
                </span>
                {rrTp2 && (
                  <span className="rounded bg-[#1D4ED8] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                    {rrTp2}
                  </span>
                )}
              </div>
              <p className="mt-1 font-mono text-base sm:text-lg font-extrabold text-[#1D4ED8] break-words">
                {formatSignalPrice(tp2Num, signal.asset)}
              </p>
              <p className="mt-0.5 text-[10px] font-mono text-[#475569] break-words">
                Primary Structural Target
              </p>
            </div>

            {/* Take Profit 3 */}
            <div className="col-span-2 md:col-span-1 min-w-0 break-words rounded-xl border-2 border-[#1D4ED8] bg-[#DBEAFE]/55 p-3">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0F172A]">
                  Take Profit 3
                </span>
                {rrTp3 && (
                  <span className="rounded bg-[#0F172A] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                    {rrTp3}
                  </span>
                )}
              </div>
              <p className="mt-1 font-mono text-base sm:text-lg font-extrabold text-[#1D4ED8] break-words">
                {formatSignalPrice(tp3Num, signal.asset)}
              </p>
              <p className="mt-0.5 text-[10px] font-mono text-[#475569] break-words">
                Extended Runner Target
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Split Layout: Chart View Side-by-Side with Institutional Mechanics & Tools Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chart with Normalized Coordinate Visual Proof Overlays + Technical Summary + Market Mechanics & How It Works */}
        <div className="lg:col-span-7 space-y-4">
          <InteractiveChartOverlay
            imageUrl={chartImage || signal.chartImageUrl || ''}
            signal={signal}
          />

          {/* Interactive Multi-Timeframe Market Projection Chart (5M, 15M, 1H, 4H) with Downloadable Screenshot */}
          <MultiTimeframeProjectionChart signal={signal} />

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

            {/* Explicit Execution Summary Strip inside Technical Summary */}
            <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/60 p-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="font-bold text-[#0F172A]">
                ENTRY:{' '}
                <span className="text-[#1D4ED8]">
                  {formatSignalPrice(entryPriceNum, signal.asset)}
                </span>
              </span>
              <span className="text-[#CBD5E1]">|</span>
              <span className="font-bold text-[#0F172A]">
                SL:{' '}
                <span className="text-[#EF4444]">
                  {formatSignalPrice(stopLossNum, signal.asset)}
                </span>
              </span>
              <span className="text-[#CBD5E1]">|</span>
              <span className="font-bold text-[#0F172A]">
                TP1:{' '}
                <span className="text-[#1D4ED8]">
                  {formatSignalPrice(tp1Num, signal.asset)}
                </span>
              </span>
              <span className="text-[#CBD5E1]">|</span>
              <span className="font-bold text-[#0F172A]">
                TP2:{' '}
                <span className="text-[#1D4ED8]">
                  {formatSignalPrice(tp2Num, signal.asset)}
                </span>
              </span>
              {tp3Num > 0 && (
                <>
                  <span className="text-[#CBD5E1]">|</span>
                  <span className="font-bold text-[#0F172A]">
                    TP3:{' '}
                    <span className="text-[#1D4ED8]">
                      {formatSignalPrice(tp3Num, signal.asset)}
                    </span>
                  </span>
                </>
              )}
            </div>

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
            <div className="mt-3.5 grid grid-cols-1 xl:grid-cols-2 gap-3">
              {[
                {
                  label: 'Entry Price',
                  value: entryPriceNum,
                  color: '#0F172A',
                  badge: '#F59E0B',
                  yPct: entryY,
                  sub: isBuy ? 'Buy Execution' : isSell ? 'Sell Execution' : 'Entry Level',
                },
                {
                  label: 'Stop Loss (SL)',
                  value: stopLossNum,
                  color: '#EF4444',
                  badge: '#EF4444',
                  yPct: stopLossY,
                  sub: 'Tight 0.8x-1.5x ATR',
                },
                {
                  label: 'Take Profit 1 (TP1)',
                  value: tp1Num,
                  color: '#1D4ED8',
                  badge: '#2563EB',
                  yPct: tp1Y,
                  sub: rrTp1 ? `Conservative (${rrTp1})` : 'Target 1',
                },
                {
                  label: 'Take Profit 2 (TP2)',
                  value: tp2Num,
                  color: '#1D4ED8',
                  badge: '#1D4ED8',
                  yPct: tp2Y,
                  sub: rrTp2 ? `Primary (${rrTp2})` : 'Target 2',
                },
                ...(tp3Num > 0
                  ? [
                      {
                        label: 'Take Profit 3 (TP3)',
                        value: tp3Num,
                        color: '#1D4ED8',
                        badge: '#0F172A',
                        yPct: tp3Y,
                        sub: rrTp3 ? `Extended Runner (${rrTp3})` : 'Target 3',
                        fullWidth: true,
                      },
                    ]
                  : []),
              ].map((level) => (
                <div
                  key={level.label}
                  className={`min-w-0 break-words rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 ${
                    'fullWidth' in level && level.fullWidth ? 'xl:col-span-2' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: level.badge }}
                      />
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#475569] break-words">
                        {level.label}
                      </p>
                    </div>
                    {typeof level.yPct === 'number' && (
                      <span className="shrink-0 text-[9px] font-mono text-[#475569]">
                        Y:{level.yPct}%
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-col items-start gap-1 min-w-0">
                    <p
                      className="font-mono text-base font-extrabold break-words"
                      style={{ color: level.color }}
                    >
                      {formatSignalPrice(level.value, signal.asset)}
                    </p>
                    {level.sub && (
                      <span className="text-[10px] font-mono text-[#475569] break-words">
                        {level.sub}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {signal.accuracy_verification?.verification_checks &&
              signal.accuracy_verification.verification_checks.length > 0 && (
                <div className="mt-3.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1D4ED8] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1D4ED8]" />
                      5-Stage Accuracy Guardrails Passed
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-[#0F172A]">
                      Calibrated
                    </span>
                  </div>
                  <div className="space-y-1">
                    {signal.accuracy_verification.verification_checks.map((check, i) => (
                      <p
                        key={i}
                        className="text-[11px] font-mono text-[#0F172A] leading-snug flex items-start gap-1.5"
                      >
                        <span className="text-[#1D4ED8] font-bold">✓</span>
                        <span>{check}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
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
