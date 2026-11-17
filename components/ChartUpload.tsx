'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClipboardPaste,
  Image as ImageIcon,
  Loader2,
  ScanLine,
  UploadCloud,
} from 'lucide-react';
import { SAMPLE_CHARTS, SampleChart } from '@/lib/sample-charts';

export interface ChartScanOptions {
  asset: string;
  timeframe: string;
  sampleId?: string;
}

interface ChartUploadProps {
  onAnalyze: (imageData: string, options: ChartScanOptions) => Promise<void>;
  isLoading: boolean;
}

const ASSETS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'NAS100'];
const TIMEFRAMES = ['5M', '15M', '1H', '4H'];
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ChartUpload({ onAnalyze, isLoading }: ChartUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleChart | null>(null);
  const [asset, setAsset] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('15M');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Choose a PNG, JPG, or WEBP chart image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Chart images must be smaller than 10 MB.');
      return;
    }
    setError('');
    setSelectedSample(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => setError('The selected image could not be read.');
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const image = Array.from(event.clipboardData?.items ?? [])
        .find((item) => ACCEPTED_TYPES.includes(item.type))
        ?.getAsFile();
      if (image) loadFile(image);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadFile]);

  const selectSample = (sample: SampleChart) => {
    setAsset(sample.asset);
    setTimeframe(sample.timeframe.toUpperCase());
    setSelectedSample(sample);
    setPreview(sample.thumbnailUrl);
    setError('');
  };

  const scan = () => {
    if (preview) {
      void onAnalyze(preview, {
        asset,
        timeframe,
        ...(selectedSample ? { sampleId: selectedSample.id } : {}),
      });
    }
  };

  return (
    <div className="saas-card rounded-2xl p-4 sm:p-5 space-y-5">
      <div>
        <p className="text-sm font-bold text-[#0F172A]">Chart input</p>
        <p className="mt-1 text-xs text-[#475569]">Upload, drop, or paste a chart screenshot.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Asset</span>
          {ASSETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAsset(value)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-mono font-semibold transition ${
                asset === value
                  ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                  : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] hover:border-[#93C5FD] hover:bg-[#EFF6FF]/60 hover:text-[#0F172A]'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Timeframe</span>
          {TIMEFRAMES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeframe(value)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-mono font-semibold transition ${
                timeframe === value
                  ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                  : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] hover:border-[#93C5FD] hover:bg-[#EFF6FF]/60 hover:text-[#0F172A]'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {preview ? (
        <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-[#F8FAFC]">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-medium text-[#0F172A]">
              <ImageIcon className="h-3.5 w-3.5 text-[#1D4ED8]" /> Preview · {asset} · {timeframe}
            </span>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setSelectedSample(null);
              }}
              className="text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF]"
            >
              Remove
            </button>
          </div>
          <img
            src={preview}
            alt={`${asset} ${timeframe} chart preview`}
            className="max-h-64 w-full object-contain bg-[#F8FAFC]"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragOver(false);
            const file = event.dataTransfer.files[0];
            if (file) loadFile(file);
          }}
          className={`flex min-h-52 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition ${
            isDragOver
              ? 'border-[#1D4ED8] bg-[#EFF6FF]'
              : 'border-[#BFDBFE] bg-[#F8FAFC] hover:border-[#1D4ED8] hover:bg-[#EFF6FF]/60'
          }`}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]">
            <UploadCloud className="h-6 w-6 text-[#1D4ED8]" />
          </div>
          <span className="text-sm font-bold text-[#0F172A]">Drop your chart here or browse</span>
          <span className="mt-1 text-xs text-[#475569]">PNG, JPG, WEBP · up to 10 MB</span>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1 text-[11px] font-medium text-[#0F172A]">
            <ClipboardPaste className="h-3 w-3 text-[#1D4ED8]" /> Paste image with Ctrl+V
          </span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) loadFile(file);
          event.currentTarget.value = '';
        }}
      />

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#EF4444]"
        >
          {error}
        </p>
      )}

      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-[#0F172A]">Try a sample chart</p>
            <p className="text-[11px] text-[#475569]">Load a candlestick setup without an upload.</p>
          </div>
          {selectedSample && (
            <span className="rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold text-[#1D4ED8]">
              Sample loaded
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_CHARTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => selectSample(sample)}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-mono font-semibold transition ${
                selectedSample?.id === sample.id
                  ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                  : 'border-[#CBD5E1] bg-white text-[#475569] hover:border-[#93C5FD] hover:bg-[#EFF6FF]/60 hover:text-[#0F172A]'
              }`}
            >
              {sample.asset} · {sample.timeframe.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={scan}
        disabled={!preview || isLoading}
        className="btn-royal-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-saas-btn disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : (
          <ScanLine className="h-4 w-4 text-white" />
        )}
        {isLoading ? 'Scanning chart…' : 'Run SMC Vision Scan'}
      </button>
    </div>
  );
}
