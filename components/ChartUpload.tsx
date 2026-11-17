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
    <div className="chocolate-card rounded-2xl p-4 sm:p-5 space-y-5">
      <div>
        <p className="text-sm font-bold text-[#F5EBE6]">Chart input</p>
        <p className="mt-1 text-xs text-[#A8968D]">Upload, drop, or paste a chart screenshot.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[#A8968D]">Asset</span>
          {ASSETS.map((value) => (
            <button key={value} type="button" onClick={() => setAsset(value)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-mono transition ${asset === value ? 'border-[#D4A373] bg-[#3D2314] text-[#F5EBE6]' : 'border-[#D4A373]/20 bg-[#150C07] text-[#A8968D] hover:border-[#D4A373]/50'}`}>
              {value}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <span className="text-[10px] uppercase tracking-wider text-[#A8968D]">Timeframe</span>
          {TIMEFRAMES.map((value) => (
            <button key={value} type="button" onClick={() => setTimeframe(value)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-mono transition ${timeframe === value ? 'border-[#D4A373] bg-[#3D2314] text-[#F5EBE6]' : 'border-[#D4A373]/20 bg-[#150C07] text-[#A8968D] hover:border-[#D4A373]/50'}`}>
              {value}
            </button>
          ))}
        </div>
      </div>

      {preview ? (
        <div className="overflow-hidden rounded-xl border border-[#D4A373]/25 bg-[#0B0B0B]">
          <div className="flex items-center justify-between border-b border-[#D4A373]/15 px-3 py-2">
            <span className="flex items-center gap-2 text-xs text-[#A8968D]"><ImageIcon className="h-3.5 w-3.5 text-[#D4A373]" /> Preview · {asset} · {timeframe}</span>
            <button type="button" onClick={() => { setPreview(null); setSelectedSample(null); }} className="text-xs text-[#D4A373] hover:text-[#F5EBE6]">Remove</button>
          </div>
          <img src={preview} alt={`${asset} ${timeframe} chart preview`} className="max-h-64 w-full object-contain" />
        </div>
      ) : (
        <button type="button" onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(event) => { event.preventDefault(); setIsDragOver(false); const file = event.dataTransfer.files[0]; if (file) loadFile(file); }}
          className={`flex min-h-52 w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition ${isDragOver ? 'border-[#D4A373] bg-[#3D2314]/40' : 'border-[#D4A373]/30 bg-[#150C07]/70 hover:border-[#D4A373]/60'}`}>
          <UploadCloud className="mb-3 h-8 w-8 text-[#D4A373]" />
          <span className="text-sm font-semibold text-[#F5EBE6]">Drop your chart here or browse</span>
          <span className="mt-1 text-xs text-[#A8968D]">PNG, JPG, WEBP · up to 10 MB</span>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#D4A373]/20 bg-[#1E120C] px-2.5 py-1 text-[10px] text-[#A8968D]">
            <ClipboardPaste className="h-3 w-3 text-[#D4A373]" /> Paste image with Ctrl+V
          </span>
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
        onChange={(event) => { const file = event.target.files?.[0]; if (file) loadFile(file); event.currentTarget.value = ''; }} />

      {error && <p role="alert" className="text-xs text-[#EF4444]">{error}</p>}

      <div className="rounded-xl border border-[#D4A373]/20 bg-[#150C07]/50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#F5EBE6]">Try a sample chart</p>
            <p className="text-[10px] text-[#A8968D]">Load a candlestick setup without an upload.</p>
          </div>
          {selectedSample && <span className="text-[10px] text-[#10B981]">Sample loaded</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_CHARTS.map((sample) => (
            <button key={sample.id} type="button" onClick={() => selectSample(sample)}
              className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-mono transition ${selectedSample?.id === sample.id ? 'border-[#D4A373] bg-[#3D2314] text-[#F5EBE6]' : 'border-[#D4A373]/20 bg-[#1E120C] text-[#A8968D] hover:text-[#D4A373]'}`}>
              {sample.asset} · {sample.timeframe.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={scan} disabled={!preview || isLoading}
        className="btn-bronze-gold flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4 text-[#D4A373]" />}
        {isLoading ? 'Scanning chart…' : 'Run SMC Vision Scan'}
      </button>
    </div>
  );
}
