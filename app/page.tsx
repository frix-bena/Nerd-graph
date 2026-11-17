'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import ChartUpload, { ChartScanOptions } from '@/components/ChartUpload';
import SignalDashboard from '@/components/SignalDashboard';
import { SMCSignalOutput, TradeAnalysis } from '@/lib/types';
import { SAMPLE_CHARTS } from '@/lib/sample-charts';
import { AlertCircle, ArrowDown, ScanLine } from 'lucide-react';

export default function HomePage() {
  const [activeSignal, setActiveSignal] = useState<SMCSignalOutput | null>(null);
  const [activeChartImage, setActiveChartImage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAnalyzeChart = async (image: string, options: ChartScanOptions) => {
    setIsAnalyzing(true);
    setErrorMsg('');
    if (image && image.trim() !== '') {
      setActiveChartImage(image);
    }
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
      const persistedUrl = image || analysis.chartImageUrl || data.chartImageUrl || '';
      if (persistedUrl) {
        setActiveChartImage(persistedUrl);
      }
      setActiveSignal({
        ...analysis,
        analysis_summary: analysis.summary || analysis.what_is_happening,
        chartImageUrl: persistedUrl,
      });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Network error analyzing chart.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickSampleScan = () => {
    const sample = SAMPLE_CHARTS[0];
    if (!sample) return;
    const workspaceEl = document.getElementById('workspace');
    if (workspaceEl) {
      workspaceEl.scrollIntoView({ behavior: 'smooth' });
    }
    void handleAnalyzeChart(sample.thumbnailUrl, {
      asset: sample.asset,
      timeframe: sample.timeframe.toUpperCase(),
      sampleId: sample.id,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <Navbar />

      {/* Clean, modern SaaS website hero section UI — Two-column layout on #F8FAFC with 1px light gray bottom divider */}
      <section className="relative overflow-hidden border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            {/* Left Column: Status Pill, Heavy Navy Display Heading, Slate Body Copy, Royal Blue CTA + Underlined Link */}
            <div className="flex flex-col items-start text-left lg:col-span-6">
              {/* Status Badge / Pill */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-3.5 py-1.5 shadow-saas-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1D4ED8]" />
                <span className="text-xs tracking-tight sm:text-[13px]">
                  <span className="font-bold text-[#1D4ED8]">SMC Vision Engine v2.4</span>
                  <span className="mx-1.5 text-[#93C5FD]">|</span>
                  <span className="font-semibold text-[#0F172A]">Institutional Chart Intelligence</span>
                </span>
              </div>

              {/* Heavy Display Heading */}
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-[#0F172A] sm:text-5xl lg:text-[54px]">
                Precision market structure &amp; trade levels in seconds.
              </h1>

              {/* Clean, Readable Body Paragraph */}
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#475569] sm:text-lg">
                Upload or paste any candlestick chart, line chart, or multi-day overlaid spot chart (like Kitco) to automatically map institutional Order Blocks, Fair Value Gaps, support/resistance shelves, and risk-calibrated execution levels with flat vector clarity.
              </p>

              {/* Primary CTA Button & Secondary Link Directly Beneath */}
              <div className="mt-8 flex flex-col items-start">
                <a
                  href="#workspace"
                  className="inline-flex items-center justify-center gap-2.5 rounded-[8px] bg-[#1D4ED8] px-6 py-3.5 text-sm font-bold text-white shadow-saas-btn transition hover:bg-[#1E40AF] sm:text-base"
                >
                  <span>Start Chart Analysis</span>
                  <ArrowDown className="h-4 w-4 stroke-[2.5] text-white" />
                </a>

                <button
                  type="button"
                  onClick={handleQuickSampleScan}
                  className="mt-3 text-xs font-semibold text-[#1D4ED8] underline decoration-[#1D4ED8] underline-offset-4 transition hover:text-[#1E40AF] sm:text-sm"
                >
                  Or load an instant XAU/USD institutional sample setup
                </button>
              </div>
            </div>

            {/* Right Column: Flat 2D Vector Art Illustration with Soft Radial Ice-Blue Glow Behind */}
            <div className="relative flex items-center justify-center lg:col-span-6">
              {/* Subtle, soft radial ice-blue glow behind the right-side illustration */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-8 rounded-full opacity-95 blur-2xl"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, rgba(191, 219, 254, 0.75) 0%, rgba(219, 234, 254, 0.55) 42%, rgba(248, 250, 252, 0) 75%)',
                }}
              />

              {/* High-resolution Flat 2D Vector UI Mockup Illustration */}
              <div className="relative w-full max-w-[580px]">
                <svg
                  viewBox="0 0 600 440"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-auto drop-shadow-[0_12px_28px_rgba(15,23,42,0.07)]"
                  role="img"
                  aria-label="Flat 2D vector illustration of institutional SMC chart analysis interface"
                >
                  {/* Soft Pastel Blue Geometric Background Accents */}
                  <rect
                    x="28"
                    y="22"
                    width="544"
                    height="384"
                    rx="16"
                    fill="#DBEAFE"
                    stroke="#0F172A"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="556"
                    cy="48"
                    r="24"
                    fill="#F59E0B"
                    stroke="#0F172A"
                    strokeWidth="2.5"
                  />
                  <rect
                    x="14"
                    y="348"
                    width="52"
                    height="52"
                    rx="10"
                    fill="#BFDBFE"
                    stroke="#0F172A"
                    strokeWidth="2.5"
                  />

                  {/* Main Front-Facing Digital UI Mockup Window */}
                  <rect
                    x="44"
                    y="38"
                    width="512"
                    height="352"
                    rx="12"
                    fill="#FFFFFF"
                    stroke="#0F172A"
                    strokeWidth="2.5"
                  />

                  {/* Window Top Bar */}
                  <path
                    d="M44 50C44 43.3726 49.3726 38 56 38H544C550.627 38 556 43.3726 556 50V76H44V50Z"
                    fill="#EFF6FF"
                    stroke="#0F172A"
                    strokeWidth="2.5"
                  />
                  {/* Window Controls: Coral Red, Warm Amber, Pastel Blue */}
                  <circle cx="68" cy="57" r="6" fill="#EF4444" stroke="#0F172A" strokeWidth="2" />
                  <circle cx="88" cy="57" r="6" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
                  <circle cx="108" cy="57" r="6" fill="#93C5FD" stroke="#0F172A" strokeWidth="2" />

                  {/* Address / Status Pill in Mockup Header */}
                  <rect
                    x="136"
                    y="48"
                    width="210"
                    height="18"
                    rx="9"
                    fill="#FFFFFF"
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                  <circle cx="148" cy="57" r="4" fill="#1D4ED8" />
                  <rect x="158" y="54" width="84" height="6" rx="3" fill="#0F172A" />
                  <rect x="250" y="54" width="46" height="6" rx="3" fill="#93C5FD" />

                  {/* Right Tag in Header */}
                  <rect
                    x="472"
                    y="48"
                    width="66"
                    height="18"
                    rx="6"
                    fill="#1D4ED8"
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                  <rect x="486" y="55" width="38" height="4" rx="2" fill="#FFFFFF" />

                  {/* Internal Grid Lines */}
                  <line x1="68" y1="128" x2="412" y2="128" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="68" y1="188" x2="412" y2="188" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="68" y1="248" x2="412" y2="248" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="68" y1="308" x2="412" y2="308" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 4" />

                  {/* Soft Pastel Blue Order Block / Fair Value Gap Highlight Zone */}
                  <rect
                    x="170"
                    y="196"
                    width="225"
                    height="46"
                    rx="6"
                    fill="#DBEAFE"
                    stroke="#1D4ED8"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                  <rect
                    x="180"
                    y="206"
                    width="74"
                    height="18"
                    rx="4"
                    fill="#1D4ED8"
                  />
                  <text
                    x="190"
                    y="218"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    BULLISH FVG
                  </text>

                  {/* Warm Amber Demand Order Block Zone */}
                  <rect
                    x="92"
                    y="286"
                    width="155"
                    height="36"
                    rx="6"
                    fill="#FEF3C7"
                    stroke="#F59E0B"
                    strokeWidth="2"
                  />
                  <rect
                    x="102"
                    y="295"
                    width="76"
                    height="18"
                    rx="4"
                    fill="#F59E0B"
                    stroke="#0F172A"
                    strokeWidth="1.5"
                  />
                  <text
                    x="110"
                    y="307"
                    fill="#0F172A"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    DEMAND OB
                  </text>

                  {/* Break of Structure (BOS) Line */}
                  <line
                    x1="196"
                    y1="146"
                    x2="372"
                    y2="146"
                    stroke="#0F172A"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <rect
                    x="252"
                    y="134"
                    width="64"
                    height="18"
                    rx="4"
                    fill="#EFF6FF"
                    stroke="#0F172A"
                    strokeWidth="1.5"
                  />
                  <text
                    x="263"
                    y="146"
                    fill="#0F172A"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    BOS ↑
                  </text>

                  {/* Flat 2D Vector Candlesticks (Cobalt Blue & Coral Red with Dark Navy Outlines) */}
                  {/* Candle 1 (Bearish Coral Red) */}
                  <line x1="96" y1="226" x2="96" y2="290" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="86" y="240" width="20" height="36" rx="3" fill="#EF4444" stroke="#0F172A" strokeWidth="2.5" />

                  {/* Candle 2 (Bearish Sweep Coral Red) */}
                  <line x1="134" y1="252" x2="134" y2="328" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="124" y="264" width="20" height="42" rx="3" fill="#EF4444" stroke="#0F172A" strokeWidth="2.5" />

                  {/* Candle 3 (Bullish Cobalt Blue Displacement) */}
                  <line x1="172" y1="184" x2="172" y2="310" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="162" y="198" width="20" height="96" rx="3" fill="#1D4ED8" stroke="#0F172A" strokeWidth="2.5" />

                  {/* Candle 4 (Bullish Cobalt Blue) */}
                  <line x1="210" y1="148" x2="210" y2="220" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="200" y="160" width="20" height="44" rx="3" fill="#2563EB" stroke="#0F172A" strokeWidth="2.5" />

                  {/* Candle 5 (Bearish Retrace Coral Red into FVG) */}
                  <line x1="248" y1="168" x2="248" y2="232" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="238" y="176" width="20" height="42" rx="3" fill="#EF4444" stroke="#0F172A" strokeWidth="2.5" />

                  {/* Candle 6 (Bullish Cobalt Blue Mitigation) */}
                  <line x1="286" y1="142" x2="286" y2="226" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="276" y="156" width="20" height="58" rx="3" fill="#1D4ED8" stroke="#0F172A" strokeWidth="2.5" />

                  {/* Candle 7 (Bullish Cobalt Blue Impulse) */}
                  <line x1="324" y1="104" x2="324" y2="172" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="314" y="116" width="20" height="44" rx="3" fill="#1D4ED8" stroke="#0F172A" strokeWidth="2.5" />

                  {/* Candle 8 (Bullish Expansion) */}
                  <line x1="362" y1="88" x2="362" y2="138" stroke="#0F172A" strokeWidth="2.5" />
                  <rect x="352" y="96" width="20" height="30" rx="3" fill="#2563EB" stroke="#0F172A" strokeWidth="2.5" />

                  {/* Right Side Panel Inside UI Mockup: Signal Metrics Card */}
                  <rect
                    x="418"
                    y="94"
                    width="120"
                    height="274"
                    rx="10"
                    fill="#F8FAFC"
                    stroke="#0F172A"
                    strokeWidth="2.5"
                  />

                  {/* Confidence Gauge Box */}
                  <rect
                    x="430"
                    y="108"
                    width="96"
                    height="54"
                    rx="6"
                    fill="#EFF6FF"
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                  <text x="440" y="125" fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    AI CONFIDENCE
                  </text>
                  <text x="440" y="148" fill="#1D4ED8" fontSize="18" fontFamily="monospace" fontWeight="bold">
                    94.2%
                  </text>
                  <circle cx="510" cy="142" r="6" fill="#F59E0B" stroke="#0F172A" strokeWidth="1.5" />

                  {/* Target Pill (Cobalt Blue) */}
                  <rect
                    x="430"
                    y="174"
                    width="96"
                    height="42"
                    rx="6"
                    fill="#1D4ED8"
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                  <text x="440" y="190" fill="#DBEAFE" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    TAKE PROFIT
                  </text>
                  <text x="440" y="206" fill="#FFFFFF" fontSize="12" fontFamily="monospace" fontWeight="bold">
                    2,695.00
                  </text>

                  {/* Entry Pill (Amber Accent) */}
                  <rect
                    x="430"
                    y="226"
                    width="96"
                    height="42"
                    rx="6"
                    fill="#FFFFFF"
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                  <circle cx="442" cy="239" r="4" fill="#F59E0B" />
                  <text x="450" y="242" fill="#0F172A" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    ENTRY ZONE
                  </text>
                  <text x="440" y="258" fill="#0F172A" fontSize="12" fontFamily="monospace" fontWeight="bold">
                    2,652.40
                  </text>

                  {/* Stop Loss Pill (Coral Red) */}
                  <rect
                    x="430"
                    y="278"
                    width="96"
                    height="42"
                    rx="6"
                    fill="#FEF2F2"
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                  <circle cx="442" cy="291" r="4" fill="#EF4444" />
                  <text x="450" y="294" fill="#EF4444" fontSize="8" fontFamily="monospace" fontWeight="bold">
                    STOP LOSS
                  </text>
                  <text x="440" y="310" fill="#0F172A" fontSize="12" fontFamily="monospace" fontWeight="bold">
                    2,641.80
                  </text>

                  {/* Bottom R:R Bar */}
                  <rect
                    x="430"
                    y="332"
                    width="96"
                    height="22"
                    rx="5"
                    fill="#F59E0B"
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                  <text x="448" y="346" fill="#0F172A" fontSize="9" fontFamily="monospace" fontWeight="bold">
                    R:R 1 : 4.02
                  </text>

                  {/* Floating Flat Vector Callout Card (Bottom Left) */}
                  <rect
                    x="62"
                    y="344"
                    width="196"
                    height="34"
                    rx="8"
                    fill="#0F172A"
                  />
                  <circle cx="80" cy="361" r="5" fill="#F59E0B" />
                  <text x="94" y="365" fill="#FFFFFF" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    LIQUIDITY SWEEP DETECTED
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Chart Analysis Workspace */}
      <main id="workspace" className="mx-auto max-w-[1280px] space-y-8 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1 text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#1D4ED8]" />
              <span className="font-bold text-[#1D4ED8]">Live Workspace</span>
              <span className="text-[#0F172A]">· Smart Money Scanner</span>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">
              Chart analysis workspace
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#475569]">
              Upload or paste a candlestick, line, area, or multi-day overlaid chart to review its Smart Money Concepts or Macro Price Action structure, market mechanics, and execution levels.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-1.5 text-xs font-medium sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-[#1D4ED8]" />
            <span className="font-bold text-[#1D4ED8]">VISION ENGINE</span>
            <span className="font-semibold text-[#0F172A]">ONLINE</span>
          </div>
        </section>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-[#EF4444]/40 bg-[#FEF2F2] p-3.5 text-sm text-[#0F172A]"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
            <span className="font-medium">{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="ml-auto text-xs font-bold text-[#EF4444] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <section
          aria-label="Chart analysis workspace"
          className="grid items-start gap-6 lg:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.35fr)]"
        >
          <ChartUpload
            onAnalyze={handleAnalyzeChart}
            isLoading={isAnalyzing}
            persistedImage={activeChartImage}
            onImageChange={setActiveChartImage}
          />

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
              <div className="saas-card flex min-h-[440px] flex-col items-center justify-center overflow-hidden rounded-2xl p-8 text-center">
                {isAnalyzing ? (
                  <>
                    <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#1D4ED8] bg-[#EFF6FF]">
                      <ScanLine className="h-7 w-7 animate-pulse text-[#1D4ED8]" />
                      <span className="absolute inset-0 animate-ping rounded-2xl border border-[#93C5FD]" />
                    </div>
                    <h3 className="text-base font-bold text-[#0F172A]">Reading market structure</h3>
                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-[#475569]">
                      Detecting liquidity pools, order blocks, fair value gaps, and precision execution levels.
                    </p>
                    <div className="mt-8 w-full max-w-sm space-y-3">
                      {[100, 82, 64, 91].map((width, index) => (
                        <div
                          key={index}
                          className="h-3 animate-pulse rounded bg-[#DBEAFE]"
                          style={{ width: `${width}%` }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#0F172A] bg-[#EFF6FF] text-[#1D4ED8]">
                      <ScanLine className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A]">Your trade setup appears here</h3>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#475569]">
                      Load a sample chart or upload a screenshot on the left, then run the SMC vision scan to inspect the structured setup.
                    </p>
                    <button
                      type="button"
                      onClick={handleQuickSampleScan}
                      className="mt-5 text-xs font-semibold text-[#1D4ED8] underline decoration-[#1D4ED8] underline-offset-4 hover:text-[#1E40AF]"
                    >
                      Load sample XAU/USD setup now
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-12 border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-6 text-center text-xs text-[#475569]">
        <span className="font-bold text-[#0F172A]">APEX VISION AI</span>{' '}
        <span className="mx-1.5 text-[#1D4ED8]">·</span> Chart analysis is informational and not financial advice.
      </footer>
    </div>
  );
}
