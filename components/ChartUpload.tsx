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
  persistedImage?: string;
  onImageChange?: (imageData: string) => void;
  detectedAsset?: string;
  detectedTimeframe?: string;
}

const ASSETS = [
  { value: 'AUTO', label: 'Auto-Detect (AI)' },
  { value: 'XAUUSD', label: 'XAUUSD' },
  { value: 'EURUSD', label: 'EURUSD' },
  { value: 'GBPUSD', label: 'GBPUSD' },
  { value: 'NAS100', label: 'NAS100' },
  { value: 'BTCUSDT', label: 'BTCUSDT' },
  { value: 'US30', label: 'US30' },
];
const TIMEFRAMES = [
  { value: 'AUTO', label: 'Auto' },
  { value: '1M', label: '1M' },
  { value: '5M', label: '5M' },
  { value: '15M', label: '15M' },
  { value: '30M', label: '30M' },
  { value: '1H', label: '1H' },
  { value: '4H', label: '4H' },
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
];
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ChartUpload({
  onAnalyze,
  isLoading,
  persistedImage,
  onImageChange,
  detectedAsset,
  detectedTimeframe,
}: ChartUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(persistedImage || null);
  const [selectedSample, setSelectedSample] = useState<SampleChart | null>(null);
  const [asset, setAsset] = useState('AUTO');
  const [timeframe, setTimeframe] = useState('AUTO');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external persistedImage if parent updates it (e.g. quick sample scan), without ever clearing an existing Base64 preview on scan completion
  useEffect(() => {
    if (persistedImage && persistedImage.trim() !== '') {
      setPreview(persistedImage);
    }
  }, [persistedImage]);

  const loadFile = useCallback(
    (file: File) => {
      const normalizedType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
      if (!ACCEPTED_TYPES.includes(normalizedType)) {
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
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result.startsWith('data:')) {
          setPreview(reader.result);
          onImageChange?.(reader.result);
        } else {
          setError('The selected image could not be encoded as a Data URL.');
        }
      };
      reader.onerror = () => setError('The selected image could not be read.');
      reader.readAsDataURL(file);
    },
    [onImageChange]
  );

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
    setSelectedSample(sample);
    setPreview(sample.thumbnailUrl);
    onImageChange?.(sample.thumbnailUrl);
    setError('');
  };

  const scan = () => {
    const activeDataUrl = preview || persistedImage;
    if (activeDataUrl) {
      void onAnalyze(activeDataUrl, {
        asset,
        timeframe,
        ...(selectedSample ? { sampleId: selectedSample.id } : {}),
      });
    }
  };

  const activePreviewUrl = preview || persistedImage || null;
  const previewAssetBadge =
    asset === 'AUTO'
      ? detectedAsset || selectedSample?.asset || 'Auto-Detect (AI)'
      : asset;
  const previewTimeframeBadge =
    timeframe === 'AUTO'
      ? detectedTimeframe || selectedSample?.timeframe?.toUpperCase() || 'Auto'
      : timeframe;

  return (
    <div className="saas-card rounded-2xl p-4 sm:p-5 space-y-5 min-w-0">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-[#0F172A]">Chart input</p>
          <span className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-[10px] font-bold text-[#1D4ED8]">
            Candlestick &amp; Line / Overlaid Supported
          </span>
        </div>
        <p className="mt-1 text-xs text-[#475569]">
          Upload, drop, or paste any candlestick chart, line/area chart, or multi-day overlaid spot chart (e.g., Kitco).
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
            Asset
          </span>
          {ASSETS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setAsset(item.value)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-mono font-semibold transition ${
                asset === item.value
                  ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                  : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] hover:border-[#93C5FD] hover:bg-[#EFF6FF]/60 hover:text-[#0F172A]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
            Timeframe
          </span>
          {TIMEFRAMES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTimeframe(item.value)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-mono font-semibold transition ${
                timeframe === item.value
                  ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                  : 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] hover:border-[#93C5FD] hover:bg-[#EFF6FF]/60 hover:text-[#0F172A]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {activePreviewUrl ? (
        <div className="overflow-hidden rounded-xl border border-[#CBD5E1] bg-[#F8FAFC]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] bg-white px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-medium text-[#0F172A] min-w-0">
              <ImageIcon className="h-3.5 w-3.5 shrink-0 text-[#1D4ED8]" />
              <span className="truncate">
                Preview · {previewAssetBadge} · {previewTimeframeBadge}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-[#475569] hover:text-[#0F172A]"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setSelectedSample(null);
                  onImageChange?.('');
                }}
                className="text-xs font-semibold text-[#1D4ED8] hover:text-[#1E40AF]"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="relative w-full bg-[#F8FAFC] p-2">
            <img
              src={activePreviewUrl}
              alt={`${asset} ${timeframe} chart preview`}
              className="max-h-64 w-full rounded-lg object-contain bg-[#F8FAFC] block"
            />
          </div>
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
          className={`flex min-h-52 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition ${isDragOver
            ? 'border-[#1D4ED8] bg-[#EFF6FF]'
            : 'border-[#BFDBFE] bg-[#F8FAFC] hover:border-[#1D4ED8] hover:bg-[#EFF6FF]/60'
            }`}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]">
            <UploadCloud className="h-6 w-6 text-[#1D4ED8]" />
          </div>
          <span className="text-sm font-bold text-[#0F172A]">Drop your chart here or browse</span>
          <span className="mt-1 text-xs text-[#475569]">
            Candlestick, Line, Area, or Kitco Overlaid Charts · PNG, JPG, WEBP up to 10 MB
          </span>
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
            <p className="text-[11px] text-[#475569]">
              Test both Candlestick (SMC) and Line/Overlaid (Macro Trend) setups.
            </p>
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
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-mono font-semibold transition ${selectedSample?.id === sample.id
                ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                : 'border-[#CBD5E1] bg-white text-[#475569] hover:border-[#93C5FD] hover:bg-[#EFF6FF]/60 hover:text-[#0F172A]'
                }`}
            >
              {sample.asset} · {sample.timeframe.toUpperCase()}
              {sample.chartType === 'LINE_OR_OVERLAID' ? ' (Line)' : ''}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={scan}
        disabled={!activePreviewUrl || isLoading}
        className="btn-royal-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-saas-btn disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : (
          <ScanLine className="h-4 w-4 text-white" />
        )}
        {isLoading ? 'Scanning chart…' : 'Run Vision AI Scan'}
      </button>
    </div>
  );
}
