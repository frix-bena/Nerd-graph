'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import ChartUpload, { ChartScanOptions } from '@/components/ChartUpload';
import SignalDashboard from '@/components/SignalDashboard';
import { SMCSignalOutput, TradeAnalysis } from '@/lib/types';
import { AlertCircle, ScanLine } from 'lucide-react';

export default function HomePage() {
  const [activeSignal, setActiveSignal] = useState<SMCSignalOutput | null>(null);
  const [activeChartImage, setActiveChartImage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAnalyzeChart = async (image: string, options: ChartScanOptions) => {
    setIsAnalyzing(true);
    setErrorMsg('');
    setActiveChartImage(image);
    setActiveSignal(null);
    try {
      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, ...options }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setErrorMsg(data.message || 'Analysis failed. Please try another chart.');
        return;
      }
      const analysis = data.analysis as TradeAnalysis;
      setActiveSignal({
        ...analysis,
        analysis_summary: analysis.summary,
      });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Network error analyzing chart.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F5EBE6]">
      <Navbar />
      <main className="mx-auto max-w-[1440px] space-y-8 px-4 py-6 sm:px-6 lg:py-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#D4A373]">Apex Vision AI · Chart Intelligence</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#F5EBE6] sm:text-3xl">Chart analysis workspace</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A8968D]">Upload or paste a market chart to review its Smart Money Concepts structure and trade levels.</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full border border-[#D4A373]/20 bg-[#1E120C] px-3 py-1.5 text-[10px] font-mono text-[#A8968D] sm:self-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> VISION ENGINE ONLINE
          </div>
        </section>

        {errorMsg && (
          <div role="alert" className="flex items-center gap-3 rounded-xl border border-[#EF4444]/35 bg-[#EF4444]/10 p-3 text-sm text-[#F5EBE6]">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg('')} className="ml-auto text-xs text-[#EF4444]">Dismiss</button>
          </div>
        )}

        <section aria-label="Chart analysis workspace" className="grid items-start gap-5 lg:grid-cols-[minmax(330px,0.82fr)_minmax(0,1.35fr)]">
          <ChartUpload onAnalyze={handleAnalyzeChart} isLoading={isAnalyzing} />

          <div className="min-w-0">
            {activeSignal ? (
              <SignalDashboard
                signal={activeSignal}
                chartImage={activeChartImage}
                onOpenMT5Modal={() => undefined}
                onReset={() => setActiveSignal(null)}
                onExecuteNow={async () => undefined}
                isExecuting={false}
                executionSuccess={false}
                showExecutionControls={false}
              />
            ) : (
              <div className="chocolate-card flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-2xl p-8 text-center">
                {isAnalyzing ? (
                  <>
                    <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4A373]/35 bg-[#2A1810]">
                      <ScanLine className="h-7 w-7 animate-pulse text-[#D4A373]" />
                      <span className="absolute inset-0 animate-ping rounded-2xl border border-[#D4A373]/25" />
                    </div>
                    <h2 className="text-base font-semibold text-[#F5EBE6]">Reading market structure</h2>
                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#A8968D]">Detecting liquidity, order blocks, fair value gaps, and potential execution levels.</p>
                    <div className="mt-8 w-full max-w-sm space-y-3">
                      {[100, 82, 64, 91].map((width, index) => (
                        <div key={index} className="h-3 animate-pulse rounded bg-[#2A1810]" style={{ width: `${width}%` }} />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4A373]/25 bg-[#2A1810] text-[#D4A373]"><ScanLine className="h-6 w-6" /></div>
                    <h2 className="text-base font-semibold text-[#F5EBE6]">Your trade setup appears here</h2>
                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#A8968D]">Load a sample chart or add a screenshot, then run the SMC vision scan to see the analysis.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="mt-12 border-t border-[#D4A373]/15 px-4 py-5 text-center text-[10px] text-[#A8968D]">
        APEX VISION AI <span className="mx-1.5 text-[#D4A373]">·</span> Chart analysis is informational and not financial advice.
      </footer>
    </div>
  );
}
