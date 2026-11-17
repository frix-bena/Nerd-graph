'use client';

import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  X,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Terminal,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface VideoDemoSectionProps {
  isOpenModal?: boolean;
  onCloseModal?: () => void;
  showInlineBanner?: boolean;
  onOpenModal?: () => void;
}

export default function VideoDemoSection({
  isOpenModal = false,
  onCloseModal,
  showInlineBanner = true,
  onOpenModal,
}: VideoDemoSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(35);
  const videoRef = useRef<HTMLVideoElement>(null);

  const steps = [
    {
      num: '01',
      title: 'Upload Any Financial Chart',
      desc: 'Drag & drop screenshots or paste directly from clipboard (Ctrl+V) for Forex, Crypto, Gold, and Indices.',
      tag: 'Multi-Asset Support',
    },
    {
      num: '02',
      title: 'Vision AI SMC Detection',
      desc: 'Institutional vision engine identifies Break of Structure (BOS), Fair Value Gaps (FVGs), and unmitigated Order Blocks at temperature 0.2.',
      tag: 'Smart Money Concepts',
    },
    {
      num: '03',
      title: 'Automated MT5 Bridge Execution',
      desc: 'Signals feature exact Entry, Stop Loss, TP1, and TP2 (never below 1:2 RRR) with auto-execution via MQL5 Webhook.',
      tag: 'One-Click Copilot',
    },
  ];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <>
      {/* Inline Core View Banner Container */}
      {showInlineBanner && (
        <div className="w-full mb-8 rounded-2xl bg-gradient-to-r from-[#2A1810] via-[#1E120C] to-[#2A1810] border border-[#D4A373]/30 p-5 shadow-card-lux transition-all duration-300 hover:border-[#D4A373]/60 group">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            {/* Title & Badge */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-[#3D2314] border border-[#D4A373]/40 flex items-center justify-center text-[#D4A373] shadow-inner group-hover:scale-105 transition-transform">
                <Play className="w-5 h-5 fill-current ml-0.5 text-[#D4A373]" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4A373] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D4A373]"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-[#F5EBE6]">
                    🎥 How It Works: Watch 60s Demo
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-[#5A341E] text-[#D4A373] rounded border border-[#D4A373]/30">
                    Interactive
                  </span>
                </div>
                <p className="text-xs text-[#A8968D] mt-0.5">
                  See how institutional traders scan charts, detect SMC confluences, and route signals into MetaTrader 5 in seconds.
                </p>
              </div>
            </div>

            {/* Quick Steps Preview & Action Button */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="hidden lg:flex items-center gap-2 text-xs text-[#A8968D]">
                <span className="px-2 py-1 rounded bg-[#1E120C] border border-[#D4A373]/20 text-[#D4A373] font-mono">
                  1. Scan
                </span>
                <ChevronRight className="w-3 h-3 text-[#A8968D]" />
                <span className="px-2 py-1 rounded bg-[#1E120C] border border-[#D4A373]/20 text-[#D4A373] font-mono">
                  2. Analyze
                </span>
                <ChevronRight className="w-3 h-3 text-[#A8968D]" />
                <span className="px-2 py-1 rounded bg-[#1E120C] border border-[#D4A373]/20 text-[#10B981] font-mono">
                  3. Execute MT5
                </span>
              </div>

              <button
                onClick={onOpenModal}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl btn-bronze-gold text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-current text-[#D4A373]" />
                <span>Launch Video Walkthrough</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styled HTML5 Video Player Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl rounded-2xl bg-gradient-to-b from-[#2A1810] to-[#1E120C] border border-[#D4A373]/50 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#D4A373]/20 flex items-center justify-between bg-[#1E120C]/70">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-[#F5EBE6] flex items-center gap-2">
                  🎥 <span>How It Works: Watch 60s Demo</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#3D2314] text-[#D4A373] border border-[#D4A373]/30 font-mono">
                  00:60 WALKTHROUGH
                </span>
              </div>
              <button
                onClick={onCloseModal}
                className="w-8 h-8 rounded-lg bg-[#2A1810] hover:bg-[#3D2314] border border-[#D4A373]/30 flex items-center justify-center text-[#A8968D] hover:text-[#F5EBE6] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Viewport / Interactive Simulation Player */}
            <div className="relative w-full aspect-video bg-[#0B0B0B] flex items-center justify-center overflow-hidden group">
              {/* Animated Demo Canvas / Video Simulation */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1E120C] via-[#0B0B0B] to-[#150C07] p-8">
                {/* Simulated Chart Scanning Overlay */}
                <div className="w-full h-full max-w-2xl rounded-xl border border-[#D4A373]/30 bg-[#0E0805]/90 p-4 flex flex-col justify-between relative shadow-2xl">
                  {/* Laser scan line if playing */}
                  {isPlaying && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D4A373] to-transparent shadow-[0_0_15px_#D4A373] animate-pulse top-1/3 z-20" />
                  )}

                  <div className="flex items-center justify-between border-b border-[#D4A373]/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                      <span className="font-mono text-xs text-[#D4A373] font-bold">
                        APEX_VISION_AI :: SCANNING XAUUSD (15m)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#A8968D]">
                      CONFIDENCE: 94.2% | SMC CONFLUENCE: 4
                    </span>
                  </div>

                  {/* Simulated SMC markup diagram */}
                  <div className="flex-1 flex items-center justify-around py-4">
                    <div className="text-center p-3 rounded-lg bg-[#2A1810]/70 border border-[#10B981]/40">
                      <p className="text-[10px] text-[#A8968D]">STRUCTURE</p>
                      <p className="text-xs font-bold text-[#10B981] mt-0.5">
                        Bullish BOS &uarr;
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#2A1810]/70 border border-[#D4A373]/40">
                      <p className="text-[10px] text-[#A8968D]">IMBALANCE</p>
                      <p className="text-xs font-bold text-[#D4A373] mt-0.5">
                        15m Bullish FVG
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#2A1810]/70 border border-[#34D399]/40">
                      <p className="text-[10px] text-[#A8968D]">ORDER BLOCK</p>
                      <p className="text-xs font-bold text-[#34D399] mt-0.5">
                        Demand OB Mitigated
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#2A1810]/70 border border-[#10B981]/40">
                      <p className="text-[10px] text-[#A8968D]">MT5 AUTO-EXECUTE</p>
                      <p className="text-xs font-bold text-[#10B981] mt-0.5">
                        BUY 0.5 Lots Sent
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar & Status */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#A8968D] pt-2 border-t border-[#D4A373]/20">
                    <span>STATUS: {isPlaying ? 'ANALYZING LIVE FRAMES...' : 'PAUSED (CLICK PLAY)'}</span>
                    <span className="text-[#D4A373]">RRR: 1:4.02 (COMPLIANT &gt; 1:2)</span>
                  </div>
                </div>
              </div>

              {/* Fallback & Central Play Button */}
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute z-30 w-20 h-20 rounded-full bg-[#5A341E]/90 hover:bg-[#6E4025] border-2 border-[#D4A373] flex items-center justify-center text-[#F5EBE6] shadow-gold-glow transition-all hover:scale-110"
                >
                  <Play className="w-8 h-8 fill-current ml-1 text-[#D4A373]" />
                </button>
              )}

              {/* Bottom Custom Video Controls Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 flex items-center justify-between text-xs text-[#F5EBE6] z-30">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg bg-[#2A1810] hover:bg-[#3D2314] text-[#D4A373] border border-[#D4A373]/30"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>

                  <button
                    onClick={() => setProgress(0)}
                    className="p-1.5 rounded-lg bg-[#2A1810] hover:bg-[#3D2314] text-[#A8968D]"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <span className="font-mono text-[11px] text-[#A8968D]">
                    {isPlaying ? '00:28' : '00:00'} / 00:60
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 mx-4 h-1.5 bg-[#2A1810] rounded-full overflow-hidden cursor-pointer border border-[#D4A373]/20">
                  <div
                    className="h-full bg-gradient-to-r from-[#D4A373] to-[#5A341E] rounded-full"
                    style={{ width: `${isPlaying ? 65 : 15}%` }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg bg-[#2A1810] hover:bg-[#3D2314] text-[#A8968D]"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Step-by-Step Feature Breakdown Text */}
            <div className="p-6 bg-[#1E120C] border-t border-[#D4A373]/20">
              <h4 className="text-xs uppercase tracking-widest text-[#D4A373] font-mono font-bold mb-3">
                Step-by-Step Workflow Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {steps.map((st, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      activeStep === i
                        ? 'bg-[#2A1810] border-[#D4A373] shadow-card-lux'
                        : 'bg-[#150C07] border-[#D4A373]/15 hover:border-[#D4A373]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-black text-[#D4A373]">
                        {st.num}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3D2314] text-[#A8968D] border border-[#D4A373]/20">
                        {st.tag}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#F5EBE6] mb-1">
                      {st.title}
                    </p>
                    <p className="text-xs text-[#A8968D] leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Ready Action CTA */}
              <div className="mt-5 pt-4 border-t border-[#D4A373]/15 flex items-center justify-between">
                <span className="text-xs text-[#A8968D]">
                  Ready to test with your own chart or one of our live presets?
                </span>
                <button
                  onClick={onCloseModal}
                  className="px-4 py-2 rounded-xl btn-bronze-gold text-xs font-bold flex items-center gap-2 shadow"
                >
                  <span>Start Scanning Charts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
