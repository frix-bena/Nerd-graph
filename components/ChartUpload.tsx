'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  ClipboardPaste,
  Image as ImageIcon,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
  Flame,
} from 'lucide-react';
import { SAMPLE_CHARTS, SampleChart } from '@/lib/sample-charts';

interface ChartUploadProps {
  onAnalyze: (imageData: string, sampleId?: string) => Promise<void>;
  isLoading: boolean;
}

export default function ChartUpload({ onAnalyze, isLoading }: ChartUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleChart | null>(null);
  const [pasteNotice, setPasteNotice] = useState(false);
  const [scanStage, setScanStage] = useState('Idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Ctrl+V paste anywhere on page
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            setPasteNotice(true);
            setTimeout(() => setPasteNotice(false), 3000);
          }
          break;
        }
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Read file as base64 data URI
  const processFile = (file: File) => {
    setSelectedSample(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      triggerAnalysis(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const selectSampleChart = (sample: SampleChart) => {
    setSelectedSample(sample);
    setPreview(sample.thumbnailUrl);
    triggerAnalysis(sample.thumbnailUrl, sample.id);
  };

  const triggerAnalysis = async (img: string, sampleId?: string) => {
    setScanStage('Parsing Candlestick Geometries...');
    setTimeout(() => setScanStage('Scanning Market Structure (BOS / CHOCH)...'), 600);
    setTimeout(() => setScanStage('Detecting Fair Value Gaps (FVGs) & Order Blocks...'), 1200);
    setTimeout(() => setScanStage('Calculating Invalidation & Asymmetric RRR (> 1:2)...'), 1800);
    await onAnalyze(img, sampleId);
  };

  return (
    <div className="w-full space-y-6">
      {/* Upload Zone Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 border ${
          isDragOver
            ? 'bg-[#3D2314] border-[#D4A373] shadow-gold-glow scale-[1.008]'
            : 'bg-gradient-to-br from-[#2A1810] via-[#1E120C] to-[#150C07] border-[#D4A373]/20 hover:border-[#D4A373]/50 shadow-card-lux'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Laser scanner animation while loading */}
        {isLoading && (
          <div className="absolute inset-0 z-20 rounded-2xl overflow-hidden pointer-events-none">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#D4A373] to-transparent shadow-[0_0_20px_#D4A373] animate-pulse absolute top-1/2 -translate-y-1/2" />
            <div className="absolute inset-0 bg-[#0B0B0B]/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-[#D4A373] animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-[#F5EBE6]">
                  Vision AI Engine Processing Chart
                </p>
                <p className="text-xs font-mono text-[#D4A373] mt-1 animate-pulse">
                  {scanStage}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
          {/* Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3D2314] to-[#1E120C] border border-[#D4A373]/40 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <UploadCloud className="w-8 h-8 text-[#D4A373]" />
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold text-[#F5EBE6]">
              Drop Financial Chart Screenshot Here
            </h3>
            <p className="text-xs sm:text-sm text-[#A8968D] mt-1">
              Supports <span className="text-[#D4A373]">Forex</span>,{' '}
              <span className="text-[#D4A373]">Crypto</span>,{' '}
              <span className="text-[#D4A373]">Gold (XAU/USD)</span>, and{' '}
              <span className="text-[#D4A373]">Indices (US30 / NAS100)</span>
            </p>
          </div>

          {/* Paste notice pill */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E120C] border border-[#D4A373]/25 text-xs text-[#A8968D]">
              <ClipboardPaste className="w-3.5 h-3.5 text-[#D4A373]" />
              Press <kbd className="px-1.5 py-0.5 rounded bg-[#3D2314] text-[#F5EBE6] font-mono text-[11px] border border-[#D4A373]/30">Ctrl + V</kbd> to Paste Directly
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1E120C] border border-[#D4A373]/25 text-xs text-[#10B981]">
              <Sparkles className="w-3 h-3 text-[#10B981]" />
              Smart Money Concepts (SMC)
            </span>
          </div>

          {pasteNotice && (
            <div className="text-xs font-semibold text-[#10B981] animate-bounce">
              ✓ Screenshot pasted from clipboard! Scanning now...
            </div>
          )}
        </div>
      </div>

      {/* Quick 1-Click Sample Charts Selection */}
      <div className="rounded-xl bg-[#1E120C]/60 border border-[#D4A373]/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#D4A373]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#F5EBE6]">
              Instant Presets: Try High-Probability SMC Setups
            </span>
          </div>
          <span className="text-[11px] text-[#A8968D]">
            Click any chart to test Vision AI engine immediately
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SAMPLE_CHARTS.map((sample) => (
            <button
              key={sample.id}
              onClick={(e) => {
                e.stopPropagation();
                selectSampleChart(sample);
              }}
              disabled={isLoading}
              className={`group text-left p-3 rounded-xl border transition-all ${
                selectedSample?.id === sample.id
                  ? 'bg-[#3D2314] border-[#D4A373] shadow-gold-glow'
                  : 'bg-[#2A1810]/70 border-[#D4A373]/20 hover:border-[#D4A373]/50 hover:bg-[#2A1810]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-black text-[#F5EBE6] group-hover:text-[#D4A373] transition-colors">
                  {sample.asset}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1E120C] border border-[#D4A373]/30 text-[#D4A373] font-mono">
                  {sample.timeframe}
                </span>
              </div>
              <p className="text-[11px] text-[#A8968D] truncate">
                {sample.category} • {sample.mockAnalysis.trade_recommendation}
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                <span className={sample.mockAnalysis.trade_recommendation === 'BUY' ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                  RRR {sample.mockAnalysis.risk_reward_ratio}
                </span>
                <span className="text-[#A8968D] group-hover:text-[#F5EBE6] flex items-center gap-0.5">
                  Scan &rarr;
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
