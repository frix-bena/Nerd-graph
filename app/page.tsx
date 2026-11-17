'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import VideoDemoSection from '@/components/VideoDemoSection';
import ChartUpload from '@/components/ChartUpload';
import SignalDashboard from '@/components/SignalDashboard';
import SignalHistory from '@/components/SignalHistory';
import ExecutionModal from '@/components/ExecutionModal';
import TierModal from '@/components/TierModal';
import { SMCSignalOutput } from '@/lib/types';
import { SAMPLE_CHARTS } from '@/lib/sample-charts';
import {
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Activity,
  Layers,
  Terminal,
} from 'lucide-react';

export default function HomePage() {
  const [activeSignal, setActiveSignal] = useState<SMCSignalOutput | null>(null);
  const [activeChartImage, setActiveChartImage] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isMT5ModalOpen, setIsMT5ModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // User & MT5 state
  const [credits, setCredits] = useState(48);
  const [tier, setTier] = useState('PRO');
  const [mt5Connected, setMt5Connected] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSuccess, setExecutionSuccess] = useState(false);
  const [lastExecutionMsg, setLastExecutionMsg] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Initial load: fetch user & set up default active signal from seed
  useEffect(() => {
    fetch('/api/user')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCredits(data.user.credits || 48);
          setTier(data.user.tier || 'PRO');
          setMt5Connected(data.user.mt5Connected ?? true);
        }
      })
      .catch((err) => console.error('Failed to fetch user:', err));

    // Default to the first sample chart for instant showcase
    const defaultSample = SAMPLE_CHARTS[0];
    setActiveSignal(defaultSample.mockAnalysis);
    setActiveChartImage(defaultSample.thumbnailUrl);
  }, []);

  // Handle Chart Analysis API call
  const handleAnalyzeChart = async (imageData: string, sampleId?: string) => {
    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      setExecutionSuccess(false);
      setActiveChartImage(imageData);

      const res = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          sampleId,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        if (data.error === 'IMAGE_UNREADABLE') {
          setErrorMsg(
            'The uploaded image is blurry or not a recognizable financial chart. Please upload a clear candlestick chart screenshot.'
          );
        } else {
          setErrorMsg(data.message || 'Analysis failed. Please try another chart.');
        }
        return;
      }

      setActiveSignal(data.analysis);
      setCredits((prev) => Math.max(0, prev - 1));
      setHistoryRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error analyzing chart.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Trigger MT5 Execution
  const handleExecuteTrade = async () => {
    try {
      setIsExecuting(true);
      setExecutionSuccess(false);

      const res = await fetch('/api/mt5/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-apex-secret': 'apex_live_sec_9934af89',
        },
        body: JSON.stringify({
          action: 'EXECUTE',
          symbol: activeSignal?.asset || 'XAUUSD',
          lotSize: 0.5,
          webhookSecret: 'apex_live_sec_9934af89',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setExecutionSuccess(true);
        setLastExecutionMsg(data.message);
        setHistoryRefreshKey((prev) => prev + 1);
      } else {
        setLastExecutionMsg(data.message || 'Execution rejected by bridge.');
      }
    } catch (err: any) {
      setLastExecutionMsg(err.message || 'Failed to reach MT5 Webhook.');
    } finally {
      setIsExecuting(false);
    }
  };

  // Select signal from history table
  const handleSelectHistoricalSignal = (sig: any) => {
    setActiveSignal({
      asset: sig.asset,
      timeframe: sig.timeframe,
      market_bias: sig.marketBias || sig.market_bias,
      trade_recommendation: sig.tradeRecommendation || sig.trade_recommendation,
      confidence_score: sig.confidenceScore || sig.confidence_score,
      entry_price: sig.entryPrice || sig.entry_price,
      stop_loss: sig.stopLoss || sig.stop_loss,
      take_profit_1: sig.takeProfit1 || sig.take_profit_1,
      take_profit_2: sig.takeProfit2 || sig.take_profit_2,
      risk_reward_ratio: sig.riskRewardRatio || sig.risk_reward_ratio,
      key_confluences: sig.key_confluences || [],
      invalidation_condition: sig.invalidationCondition || sig.invalidation_condition,
      analysis_summary: sig.analysisSummary || sig.analysis_summary,
    });
    if (sig.chartImageUrl) {
      setActiveChartImage(sig.chartImageUrl);
    }
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F5EBE6]">
      {/* 1. Header & Navigation */}
      <Navbar
        onOpenDemo={() => setIsDemoModalOpen(true)}
        onOpenMT5={() => setIsMT5ModalOpen(true)}
        onOpenPricing={() => setIsPricingModalOpen(true)}
        mt5Connected={mt5Connected}
        onToggleMT5={() => setMt5Connected(!mt5Connected)}
        credits={credits}
        tier={tier}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Announcement / Mission Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#2A1810] via-[#1E120C] to-[#0B0B0B] border border-[#D4A373]/30 p-6 sm:p-8 overflow-hidden shadow-card-lux">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4A373]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3D2314] border border-[#D4A373]/40 text-xs text-[#D4A373] font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>APEX VISION AI &bull; INSTITUTIONAL SMC ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#F5EBE6] tracking-tight leading-tight">
              AI-Powered Financial Chart Analysis &amp; MT5 Signal Copilot
            </h1>
            <p className="text-sm sm:text-base text-[#A8968D] leading-relaxed">
              Upload any chart screenshot across Forex, Crypto, Gold, and Indices. Receive instant Smart Money Concepts breakdowns with Break of Structure (BOS), Fair Value Gaps (FVG), unmitigated Order Blocks, and automated MT5 trade execution.
            </p>
          </div>
        </div>

        {/* 4. Interactive Demo & Onboarding Video Section (in core view) */}
        <VideoDemoSection
          showInlineBanner={true}
          isOpenModal={isDemoModalOpen}
          onCloseModal={() => setIsDemoModalOpen(false)}
          onOpenModal={() => setIsDemoModalOpen(true)}
        />

        {/* Error Alert if IMAGE_UNREADABLE */}
        {errorMsg && (
          <div className="rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/40 p-4 flex items-center justify-between text-xs text-[#F5EBE6] animate-fadeIn">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-[#EF4444] hover:underline font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2. Chart Upload & Scan Panel */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#D4A373] font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D4A373]" />
              <span>Chart Upload &amp; Scanner</span>
            </h2>
            <span className="text-xs text-[#A8968D]">
              FastAPI / Node.js Vision Pipeline
            </span>
          </div>

          <ChartUpload onAnalyze={handleAnalyzeChart} isLoading={isAnalyzing} />
        </section>

        {/* 3. Signal Output Dashboard (Rendered when signal available) */}
        {activeSignal && (
          <section className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-widest text-[#D4A373] font-bold flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#D4A373]" />
                <span>Smart Money Concepts (SMC) Signal Output</span>
              </h2>
              <span className="text-xs text-[#10B981] font-mono">
                RRR Guaranteed &gt; 1:2
              </span>
            </div>

            <SignalDashboard
              signal={activeSignal}
              chartImage={activeChartImage}
              onOpenMT5Modal={() => setIsMT5ModalOpen(true)}
              onReset={() => {
                setActiveSignal(null);
                setActiveChartImage('');
              }}
              onExecuteNow={handleExecuteTrade}
              isExecuting={isExecuting}
              executionSuccess={executionSuccess}
            />
          </section>
        )}

        {/* 5. Automated Signal Log & MT5 Execution History */}
        <section className="space-y-3 pt-4">
          <SignalHistory
            onSelectSignal={handleSelectHistoricalSignal}
            refreshTrigger={historyRefreshKey}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[#D4A373]/20 bg-[#1E120C]/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A8968D]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#F5EBE6]">APEX VISION AI</span>
            <span>&bull;</span>
            <span>Institutional Smart Money Concepts Engine &bull; MQL5 Bridge</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="hover:text-[#D4A373] transition-colors"
            >
              Watch Demo
            </button>
            <button
              onClick={() => setIsMT5ModalOpen(true)}
              className="hover:text-[#D4A373] transition-colors"
            >
              MT5 Setup
            </button>
            <button
              onClick={() => setIsPricingModalOpen(true)}
              className="hover:text-[#D4A373] transition-colors"
            >
              Pricing &amp; Tiers
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ExecutionModal
        isOpen={isMT5ModalOpen}
        onClose={() => setIsMT5ModalOpen(false)}
        activeSignal={activeSignal}
        onExecuteTest={handleExecuteTrade}
        isExecuting={isExecuting}
        lastExecutionMsg={lastExecutionMsg}
      />

      <TierModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        currentTier={tier}
        onSelectTier={(newTier) => setTier(newTier)}
      />
    </div>
  );
}
