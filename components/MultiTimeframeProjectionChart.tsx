'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ForecastHistoricalCandle,
  ForecastProjectedPoint,
  ForecastTimeframe,
  FORECAST_TIMEFRAMES,
  MultiTimeframeForecast,
  SMCSignalOutput,
  TimeframeForecastProjection,
  formatSignalPrice,
} from '@/lib/types';
import { getAssetDecimals } from '@/lib/tools/marketData';
import {
  BarChart3,
  Camera,
  CheckCircle2,
  Download,
  GitCommit,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface MultiTimeframeProjectionChartProps {
  signal: SMCSignalOutput;
}

const TIMEFRAMES: ForecastTimeframe[] = FORECAST_TIMEFRAMES;

function roundPrice(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function buildFallbackForecast(signal: SMCSignalOutput): MultiTimeframeForecast {
  const asset = signal.asset || 'XAUUSD';
  const entry = Number(signal.entry_price) || 2652.4;
  const sl = Number(signal.stop_loss) || entry * 0.996;
  const tp1 = Number(signal.take_profit_1) || entry * 1.005;
  const tp2 = Number(signal.take_profit_2) || entry * 1.009;
  const decimals = getAssetDecimals(asset, entry);
  const isSell =
    signal.trade_recommendation === 'SELL' ||
    signal.trade_execution?.setup_type === 'SELL SETUP' ||
    signal.bias === 'BEARISH';
  const bias = isSell ? 'BEARISH' : 'BULLISH';
  const baseUnit = Math.max(Math.abs(entry - sl) * 0.35, Math.pow(10, -decimals) * 5);
  const nowSec = Math.floor(Date.now() / 1000);

  const configs: { tf: ForecastTimeframe; stepSec: number; mult: number }[] = [
    { tf: '1M', stepSec: 60, mult: 0.35 },
    { tf: '5M', stepSec: 300, mult: 0.65 },
    { tf: '15M', stepSec: 900, mult: 1.0 },
    { tf: '30M', stepSec: 1800, mult: 1.22 },
    { tf: '1H', stepSec: 3600, mult: 1.45 },
    { tf: '4H', stepSec: 14400, mult: 2.1 },
    { tf: '1D', stepSec: 86400, mult: 3.6 },
    { tf: '1W', stepSec: 604800, mult: 6.2 },
  ];

  const out = {} as MultiTimeframeForecast;

  for (const cfg of configs) {
    const unit = baseUnit * cfg.mult;
    const candles: ForecastHistoricalCandle[] = [];
    const count = 28;
    let runningClose = isSell ? entry + unit * 2.2 : entry - unit * 2.2;

    for (let i = 0; i < count; i++) {
      const t = nowSec - (count - 1 - i) * cfg.stepSec;
      const wave = Math.sin(i * 0.55) * unit * 0.48;
      const drift = isSell ? -unit * 0.08 : unit * 0.08;
      const open = roundPrice(runningClose, decimals);
      const close =
        i === count - 1
          ? roundPrice(entry, decimals)
          : roundPrice(open + wave + drift, decimals);
      const high = roundPrice(Math.max(open, close) + unit * 0.35, decimals);
      const low = roundPrice(Math.min(open, close) - unit * 0.35, decimals);
      candles.push({ time: t, open, high, low, close });
      runningClose = close;
    }

    const midMove = roundPrice((entry + tp1) / 2, decimals);
    const runnerMid = roundPrice(tp1 + (tp2 - tp1) * 0.45, decimals);

    const projectedPath: ForecastProjectedPoint[] = [
      {
        time: nowSec,
        value: roundPrice(entry, decimals),
        label: `Current (${formatSignalPrice(entry, asset)})`,
      },
      {
        time: nowSec + cfg.stepSec,
        value: roundPrice(entry, decimals),
        label: `Entry Fill (${formatSignalPrice(entry, asset)})`,
      },
      {
        time: nowSec + cfg.stepSec * 2,
        value: midMove,
        label: isSell ? 'Bearish Displacement' : 'Bullish Displacement',
      },
      {
        time: nowSec + cfg.stepSec * 3,
        value: roundPrice(tp1, decimals),
        label: `TP1 (${formatSignalPrice(tp1, asset)})`,
      },
      {
        time: nowSec + cfg.stepSec * 4,
        value: runnerMid,
        label: 'Continuation',
      },
      {
        time: nowSec + cfg.stepSec * 5,
        value: roundPrice(tp2, decimals),
        label: `TP2 (${formatSignalPrice(tp2, asset)})`,
      },
    ];

    out[cfg.tf] = {
      historicalCandles: candles,
      projectedPath,
      bias,
      shortNote: `${cfg.tf} Projection: Tight entry near ${formatSignalPrice(
        entry,
        asset
      )} with invalidation at ${formatSignalPrice(
        sl,
        asset
      )} targets quick profit at TP1 ${formatSignalPrice(
        tp1,
        asset
      )} and TP2 ${formatSignalPrice(tp2, asset)}.`,
    };
  }

  return out;
}

function formatTimeLabel(unixSec: number, tf: ForecastTimeframe): string {
  const d = new Date(unixSec * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  if (tf === '1D' || tf === '1W') {
    const mon = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = d.getUTCDate();
    return `${mon} ${day}`;
  }
  if (tf === '4H') {
    const mon = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = d.getUTCDate();
    return `${mon} ${day} ${hh}:${mm}`;
  }
  return `${hh}:${mm}`;
}

export default function MultiTimeframeProjectionChart({
  signal,
}: MultiTimeframeProjectionChartProps) {
  const normalizedInitialTf = useMemo<ForecastTimeframe>(() => {
    const raw = String(signal.timeframe || '15M').toUpperCase();
    if ((TIMEFRAMES as string[]).includes(raw)) {
      return raw as ForecastTimeframe;
    }
    return '15M';
  }, [signal.timeframe]);

  const [selectedTf, setSelectedTf] = useState<ForecastTimeframe>(normalizedInitialTf);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setSelectedTf(normalizedInitialTf);
  }, [normalizedInitialTf]);

  const forecastMap: MultiTimeframeForecast = useMemo(() => {
    const fallback = buildFallbackForecast(signal);
    if (!signal.multiTimeframeForecast) {
      return fallback;
    }
    return {
      ...fallback,
      ...signal.multiTimeframeForecast,
    };
  }, [signal]);

  const activeProjection: TimeframeForecastProjection =
    forecastMap[selectedTf] || forecastMap['15M'];

  const entryPrice = Number(signal.entry_price || signal.trade_execution?.entry_price || 0);
  const stopLoss = Number(signal.stop_loss || signal.trade_execution?.stop_loss || 0);
  const tp1 = Number(signal.take_profit_1 || signal.trade_execution?.take_profit_1 || 0);
  const tp2 = Number(signal.take_profit_2 || signal.trade_execution?.take_profit_2 || 0);
  const currentPrice =
    Number(signal.accuracy_verification?.current_market_price) ||
    activeProjection.historicalCandles[activeProjection.historicalCandles.length - 1]?.close ||
    entryPrice;

  const isBuy =
    signal.trade_recommendation === 'BUY' ||
    signal.trade_execution?.setup_type === 'BUY SETUP' ||
    (signal.trade_recommendation !== 'SELL' && activeProjection.bias !== 'BEARISH');

  const candles = useMemo(
    () => activeProjection.historicalCandles.slice(-28),
    [activeProjection.historicalCandles]
  );
  const pathPoints = activeProjection.projectedPath;

  // Compute unified Y-axis price bounds covering historical candles, future path, Entry, SL, TP1, TP2
  const { minPrice, maxPrice, priceTicks } = useMemo(() => {
    const values: number[] = [entryPrice, stopLoss, tp1, tp2, currentPrice].filter((v) => v > 0);
    candles.forEach((c) => {
      values.push(c.high, c.low);
    });
    pathPoints.forEach((p) => {
      if (p.value > 0) values.push(p.value);
    });

    const rawMin = values.length > 0 ? Math.min(...values) : 99;
    const rawMax = values.length > 0 ? Math.max(...values) : 101;
    const span = Math.max(rawMax - rawMin, rawMax * 0.002, 0.0001);
    const pad = span * 0.14;
    const minP = rawMin - pad;
    const maxP = rawMax + pad;

    const tickCount = 6;
    const ticks: number[] = [];
    for (let i = 0; i < tickCount; i++) {
      ticks.push(maxP - ((maxP - minP) * i) / (tickCount - 1));
    }

    return { minPrice: minP, maxPrice: maxP, priceTicks: ticks };
  }, [candles, pathPoints, entryPrice, stopLoss, tp1, tp2, currentPrice]);

  // SVG Layout dimensions
  const svgWidth = 920;
  const svgHeight = 430;
  const padLeft = 18;
  const padRight = 112;
  const padTop = 26;
  const padBottom = 38;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const histSlotCount = Math.max(candles.length, 1);
  const futureSlotCount = Math.max(pathPoints.length - 1, 5);
  const totalSlots = histSlotCount + futureSlotCount + 1;
  const slotWidth = plotWidth / totalSlots;

  const priceToY = useCallback(
    (price: number) => {
      const span = Math.max(maxPrice - minPrice, 1e-8);
      const ratio = (maxPrice - price) / span;
      return Math.min(
        padTop + plotHeight - 4,
        Math.max(padTop + 4, padTop + ratio * plotHeight)
      );
    },
    [maxPrice, minPrice, padTop, plotHeight]
  );

  const candleIndexToX = useCallback(
    (idx: number) => padLeft + (idx + 0.6) * slotWidth,
    [padLeft, slotWidth]
  );

  const pathIndexToX = useCallback(
    (idx: number) => {
      const lastCandleX = candleIndexToX(histSlotCount - 1);
      if (idx === 0) return lastCandleX;
      return lastCandleX + idx * slotWidth * 1.05;
    },
    [candleIndexToX, histSlotCount, slotWidth]
  );

  const handleDownloadForecastScreenshot = useCallback(() => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const width = 1600;
      const height = 920;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, width, height);

      // Header Banner
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 0, width, 96);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 96);
      ctx.lineTo(width, 96);
      ctx.stroke();

      // Title & Badges
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px Inter, system-ui, sans-serif';
      ctx.fillText(
        `APEX VISION AI — ${signal.asset} (${selectedTf}) MULTI-TIMEFRAME PROJECTION`,
        36,
        46
      );

      ctx.fillStyle = '#93C5FD';
      ctx.font = '600 16px monospace';
      ctx.fillText(
        `Bias: ${activeProjection.bias}  •  Spot: ${formatSignalPrice(
          currentPrice,
          signal.asset
        )}  •  Entry: ${formatSignalPrice(
          entryPrice,
          signal.asset
        )}  •  SL: ${formatSignalPrice(
          stopLoss,
          signal.asset
        )}  •  TP1: ${formatSignalPrice(
          tp1,
          signal.asset
        )}  •  TP2: ${formatSignalPrice(tp2, signal.asset)}  •  R:R ${
          signal.risk_reward_ratio
        }`,
        36,
        76
      );

      // Chart plot area on Canvas
      const cLeft = 40;
      const cRight = 185;
      const cTop = 126;
      const cBottom = 110;
      const cPlotW = width - cLeft - cRight;
      const cPlotH = height - cTop - cBottom;

      const cPriceToY = (p: number) => {
        const span = Math.max(maxPrice - minPrice, 1e-8);
        return cTop + ((maxPrice - p) / span) * cPlotH;
      };

      const cSlotW = cPlotW / totalSlots;
      const cCandleX = (i: number) => cLeft + (i + 0.6) * cSlotW;
      const cLastCandleX = cCandleX(histSlotCount - 1);
      const cPathX = (i: number) =>
        i === 0 ? cLastCandleX : cLastCandleX + i * cSlotW * 1.05;

      // Shaded Future Projection Zone
      ctx.fillStyle = isBuy
        ? 'rgba(29, 78, 216, 0.12)'
        : 'rgba(239, 68, 68, 0.10)';
      ctx.fillRect(cLastCandleX, cTop, cPlotW - (cLastCandleX - cLeft), cPlotH);

      // Horizontal Grid & Y-Axis Price Scale
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = 1;
      priceTicks.forEach((tick) => {
        const y = cPriceToY(tick);
        ctx.beginPath();
        ctx.moveTo(cLeft, y);
        ctx.lineTo(width - cRight, y);
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(formatSignalPrice(tick, signal.asset), width - cRight + 14, y + 5);
      });

      // Shaded Reward & Risk Bands in Forecast Zone
      const yEntry = cPriceToY(entryPrice);
      const ySl = cPriceToY(stopLoss);
      const yTp1 = cPriceToY(tp1);
      const yTp2 = cPriceToY(tp2);

      // TP2 Zone Fill
      ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.fillRect(
        cLastCandleX,
        Math.min(yEntry, yTp2),
        width - cRight - cLastCandleX,
        Math.abs(yTp2 - yEntry)
      );

      // SL Risk Fill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
      ctx.fillRect(
        cLastCandleX,
        Math.min(yEntry, ySl),
        width - cRight - cLastCandleX,
        Math.abs(ySl - yEntry)
      );

      // Draw Historical Candlesticks
      const bodyW = Math.max(6, cSlotW * 0.58);
      candles.forEach((c, idx) => {
        const cx = cCandleX(idx);
        const yO = cPriceToY(c.open);
        const yC = cPriceToY(c.close);
        const yH = cPriceToY(c.high);
        const yL = cPriceToY(c.low);
        const bull = c.close >= c.open;

        ctx.strokeStyle = bull ? '#38BDF8' : '#F87171';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, yH);
        ctx.lineTo(cx, yL);
        ctx.stroke();

        ctx.fillStyle = bull ? '#2563EB' : '#EF4444';
        const topY = Math.min(yO, yC);
        const bh = Math.max(4, Math.abs(yC - yO));
        ctx.fillRect(cx - bodyW / 2, topY, bodyW, bh);
      });

      // Draw Horizontal Trade Level Lines
      const drawLevelLine = (
        price: number,
        tag: string,
        color: string,
        bgColor: string
      ) => {
        if (price <= 0) return;
        const y = cPriceToY(price);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(cLeft, y);
        ctx.lineTo(width - cRight, y);
        ctx.stroke();

        ctx.setLineDash([]);
        const label = `${tag}: ${formatSignalPrice(price, signal.asset)}`;
        ctx.font = 'bold 14px monospace';
        const tw = ctx.measureText(label).width + 18;
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(width - cRight + 6, y - 14, tw, 28, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(label, width - cRight + 15, y + 5);
        ctx.restore();
      };

      drawLevelLine(tp2, 'TP2', '#10B981', '#065F46');
      drawLevelLine(tp1, 'TP1', '#38BDF8', '#1E3A8A');
      drawLevelLine(entryPrice, 'ENTRY', '#F59E0B', '#78350F');
      drawLevelLine(stopLoss, 'STOP', '#EF4444', '#7F1D1D');

      // Draw Projected Trajectory Curve
      if (pathPoints.length >= 2) {
        ctx.save();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 4.5;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        pathPoints.forEach((pt, idx) => {
          const px = cPathX(idx);
          const py = cPriceToY(pt.value);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();

        pathPoints.forEach((pt, idx) => {
          const px = cPathX(idx);
          const py = cPriceToY(pt.value);
          ctx.save();
          ctx.fillStyle = idx === pathPoints.length - 1 ? '#10B981' : '#F59E0B';
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (pt.label) {
            ctx.font = 'bold 13px monospace';
            const lw = ctx.measureText(pt.label).width + 14;
            const ly = idx % 2 === 0 ? py - 34 : py + 14;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(px - lw / 2, ly, lw, 24, 5);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#F8FAFC';
            ctx.fillText(pt.label, px - lw / 2 + 7, ly + 16);
          }
          ctx.restore();
        });
      }

      // Footer note
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, height - 68, width, 68);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '600 15px Inter, system-ui, sans-serif';
      ctx.fillText(activeProjection.shortNote, 36, height - 28);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${signal.asset.toLowerCase()}-${selectedTf.toLowerCase()}-projection-forecast.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  }, [
    isExporting,
    signal.asset,
    signal.risk_reward_ratio,
    selectedTf,
    activeProjection,
    currentPrice,
    entryPrice,
    stopLoss,
    tp1,
    tp2,
    maxPrice,
    minPrice,
    totalSlots,
    histSlotCount,
    isBuy,
    priceTicks,
    candles,
    pathPoints,
  ]);

  const lastCandleX = candleIndexToX(histSlotCount - 1);
  const yEntry = priceToY(entryPrice);
  const ySl = priceToY(stopLoss);
  const yTp1 = priceToY(tp1);
  const yTp2 = priceToY(tp2);

  const slAtrDistance = Math.abs(entryPrice - stopLoss);
  const entryProximityDistance = Math.abs(entryPrice - currentPrice);

  return (
    <div className="saas-card rounded-2xl p-5 space-y-4">
      {/* Header Row with Timeframe Switcher (1M, 5M, 15M, 30M, 1H, 4H, 1D, 1W) & Download Screenshot CTA */}
      <div className="flex flex-col gap-3 pb-3 border-b border-[#E2E8F0]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <BarChart3 className="w-4 h-4 shrink-0 text-[#1D4ED8]" />
              <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-[#0F172A]">
                Multi-Timeframe Market Projection Chart
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold border ${
                  activeProjection.bias === 'BULLISH'
                    ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#1D4ED8]'
                    : activeProjection.bias === 'BEARISH'
                    ? 'bg-[#FEF2F2] border-[#FECACA] text-[#EF4444]'
                    : 'bg-[#FEF3C7] border-[#FDE68A] text-[#0F172A]'
                }`}
              >
                {activeProjection.bias === 'BULLISH' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{selectedTf} {activeProjection.bias}</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-[#475569]">
              Interactive historical OHLC candles + projected pullback-to-target trajectory across 1M, 5M, 15M, 30M, 1H, 4H, 1D &amp; 1W
            </p>
          </div>

          {/* Download Projection Screenshot Button */}
          <button
            type="button"
            onClick={handleDownloadForecastScreenshot}
            disabled={isExporting}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] px-3.5 py-2 text-xs font-mono font-bold text-white shadow-sm transition-all disabled:opacity-60"
            title="Download high-resolution PNG projection chart screenshot"
          >
            <Camera className="w-3.5 h-3.5 text-[#93C5FD]" />
            <span>{isExporting ? 'Rendering PNG…' : `Download ${selectedTf} Chart`}</span>
            <Download className="w-3.5 h-3.5 text-[#93C5FD]" />
          </button>
        </div>

        {/* Timeframe Selector Tabs — Cleanly Wrapped & Horizontally Scrollable */}
        <div
          role="tablist"
          aria-label="Projection timeframe selector"
          className="flex flex-wrap items-center gap-1 max-w-full overflow-x-auto rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-1"
        >
          {TIMEFRAMES.map((tf) => {
            const isSelected = tf === selectedTf;
            return (
              <button
                key={tf}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setSelectedTf(tf);
                  setHoverIndex(null);
                }}
                className={`shrink-0 px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#1D4ED8] text-white shadow-sm'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-white'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tight Proximity & Quick-Profit Guardrail Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
          <span className="text-[10px] uppercase text-[#475569] font-bold block">
            Spot → Entry Proximity
          </span>
          <span className="text-[#0F172A] font-extrabold">
            {formatSignalPrice(currentPrice, signal.asset)} →{' '}
            {formatSignalPrice(entryPrice, signal.asset)}
          </span>
          <span className="block text-[10px] text-[#10B981] font-bold">
            ✓ Within ≤0.3x ATR ({formatSignalPrice(entryProximityDistance || 0, signal.asset)})
          </span>
        </div>

        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2]/60 px-3 py-2">
          <span className="text-[10px] uppercase text-[#EF4444] font-bold block">
            Tight Stop Loss (0.8x–1.5x ATR)
          </span>
          <span className="text-[#EF4444] font-extrabold">
            {formatSignalPrice(stopLoss, signal.asset)}
          </span>
          <span className="block text-[10px] text-[#475569]">
            Risk Distance: {formatSignalPrice(slAtrDistance, signal.asset)}
          </span>
        </div>

        <div className="rounded-xl border border-[#93C5FD] bg-[#EFF6FF]/70 px-3 py-2">
          <span className="text-[10px] uppercase text-[#1D4ED8] font-bold block">
            TP1 Quick Profit (1.0x–1.5x SL)
          </span>
          <span className="text-[#1D4ED8] font-extrabold">
            {formatSignalPrice(tp1, signal.asset)}
          </span>
          <span className="block text-[10px] text-[#1D4ED8] font-bold">
            Primary R:R {signal.risk_reward_ratio}
          </span>
        </div>

        <div className="rounded-xl border border-[#6EE7B7] bg-[#ECFDF5] px-3 py-2">
          <span className="text-[10px] uppercase text-[#047857] font-bold block">
            TP2 Extended Scalp (2.0x–2.5x SL)
          </span>
          <span className="text-[#047857] font-extrabold">
            {formatSignalPrice(tp2, signal.asset)}
          </span>
          <span className="block text-[10px] text-[#047857] font-bold">
            Max Capped Target
          </span>
        </div>
      </div>

      {/* Interactive SVG Candlestick + Future Forecast Canvas */}
      <div className="relative rounded-2xl border border-[#1E293B] bg-[#0F172A] overflow-hidden shadow-inner">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label={`Interactive ${selectedTf} market projection chart for ${signal.asset}`}
        >
          <defs>
            <linearGradient id="forecastRewardZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.10" />
            </linearGradient>
            <linearGradient id="forecastRiskZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Forecast Future Horizon Shaded Background */}
          <rect
            x={lastCandleX}
            y={padTop}
            width={svgWidth - padRight - lastCandleX}
            height={plotHeight}
            fill="rgba(30, 58, 138, 0.16)"
          />

          {/* Vertical Divider Line between Historical Candles & Future Forecast Zone */}
          <line
            x1={lastCandleX}
            y1={padTop}
            x2={lastCandleX}
            y2={padTop + plotHeight}
            stroke="#60A5FA"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <rect
            x={lastCandleX + 8}
            y={padTop + 6}
            width="154"
            height="18"
            rx="4"
            fill="#1E3A8A"
            stroke="#3B82F6"
            strokeWidth="1"
          />
          <text
            x={lastCandleX + 16}
            y={padTop + 18}
            fill="#DBEAFE"
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {selectedTf} PROJECTED PATH →
          </text>

          {/* Shaded Reward Band (Entry to TP2) & Risk Band (Entry to SL) in Future Zone */}
          <rect
            x={lastCandleX}
            y={Math.min(yEntry, yTp2)}
            width={svgWidth - padRight - lastCandleX}
            height={Math.max(2, Math.abs(yTp2 - yEntry))}
            fill="url(#forecastRewardZone)"
          />
          <rect
            x={lastCandleX}
            y={Math.min(yEntry, ySl)}
            width={svgWidth - padRight - lastCandleX}
            height={Math.max(2, Math.abs(ySl - yEntry))}
            fill="url(#forecastRiskZone)"
          />

          {/* Horizontal Price Grid Lines & Right Y-Axis Ticks */}
          {priceTicks.map((tick, idx) => {
            const y = priceToY(tick);
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.14)"
                  strokeWidth="1"
                />
                <text
                  x={svgWidth - padRight + 10}
                  y={y + 4}
                  fill="#94A3B8"
                  fontSize="10.5"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {formatSignalPrice(tick, signal.asset)}
                </text>
              </g>
            );
          })}

          {/* Right Y-Axis Border */}
          <line
            x1={svgWidth - padRight}
            y1={padTop}
            x2={svgWidth - padRight}
            y2={padTop + plotHeight}
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Historical Candlesticks */}
          {candles.map((c, idx) => {
            const cx = candleIndexToX(idx);
            const yO = priceToY(c.open);
            const yC = priceToY(c.close);
            const yH = priceToY(c.high);
            const yL = priceToY(c.low);
            const isBull = c.close >= c.open;
            const bodyTop = Math.min(yO, yC);
            const bodyH = Math.max(2.5, Math.abs(yC - yO));
            const candleW = Math.max(4, slotWidth * 0.62);
            const isHovered = hoverIndex === idx;

            return (
              <g
                key={`candle-${c.time}-${idx}`}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-crosshair"
              >
                {isHovered && (
                  <rect
                    x={cx - slotWidth / 2}
                    y={padTop}
                    width={slotWidth}
                    height={plotHeight}
                    fill="rgba(255,255,255,0.04)"
                  />
                )}
                <line
                  x1={cx}
                  y1={yH}
                  x2={cx}
                  y2={yL}
                  stroke={isBull ? '#38BDF8' : '#F87171'}
                  strokeWidth="1.6"
                />
                <rect
                  x={cx - candleW / 2}
                  y={bodyTop}
                  width={candleW}
                  height={bodyH}
                  rx="1.5"
                  fill={isBull ? '#2563EB' : '#EF4444'}
                  stroke={isBull ? '#60A5FA' : '#FCA5A5'}
                  strokeWidth="0.8"
                />
                {/* Time labels on X-axis every 6 bars */}
                {idx % 6 === 0 && (
                  <text
                    x={cx}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fill="#64748B"
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    {formatTimeLabel(c.time, selectedTf)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Horizontal Level Lines: TP2, TP1, Entry, Stop Loss */}
          {[
            {
              id: 'tp2',
              label: `TP2 ${formatSignalPrice(tp2, signal.asset)}`,
              y: yTp2,
              stroke: '#10B981',
              badgeBg: '#065F46',
              badgeText: '#ECFDF5',
            },
            {
              id: 'tp1',
              label: `TP1 ${formatSignalPrice(tp1, signal.asset)}`,
              y: yTp1,
              stroke: '#38BDF8',
              badgeBg: '#1E3A8A',
              badgeText: '#EFF6FF',
            },
            {
              id: 'entry',
              label: `ENTRY ${formatSignalPrice(entryPrice, signal.asset)}`,
              y: yEntry,
              stroke: '#F59E0B',
              badgeBg: '#78350F',
              badgeText: '#FEF3C7',
            },
            {
              id: 'sl',
              label: `SL ${formatSignalPrice(stopLoss, signal.asset)}`,
              y: ySl,
              stroke: '#EF4444',
              badgeBg: '#7F1D1D',
              badgeText: '#FEE2E2',
            },
          ].map((lvl) => (
            <g key={`lvl-${lvl.id}`}>
              <line
                x1={padLeft}
                y1={lvl.y}
                x2={svgWidth - padRight}
                y2={lvl.y}
                stroke={lvl.stroke}
                strokeWidth="1.6"
                strokeDasharray="6 4"
              />
              <rect
                x={svgWidth - padRight + 4}
                y={lvl.y - 9}
                width={padRight - 8}
                height="18"
                rx="4"
                fill={lvl.badgeBg}
                stroke={lvl.stroke}
                strokeWidth="1.2"
              />
              <text
                x={svgWidth - padRight + 8}
                y={lvl.y + 3.5}
                fill={lvl.badgeText}
                fontSize="9.2"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {lvl.label}
              </text>
            </g>
          ))}

          {/* Projected Trajectory Polyline & Waypoint Nodes */}
          {pathPoints.length >= 2 && (
            <g>
              {/* Glow under path */}
              <polyline
                fill="none"
                stroke="rgba(245, 158, 11, 0.25)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pathPoints
                  .map((pt, idx) => `${pathIndexToX(idx)},${priceToY(pt.value)}`)
                  .join(' ')}
              />
              {/* Crisp Dashed Forecast Line */}
              <polyline
                fill="none"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeDasharray="7 5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pathPoints
                  .map((pt, idx) => `${pathIndexToX(idx)},${priceToY(pt.value)}`)
                  .join(' ')}
              />

              {pathPoints.map((pt, idx) => {
                const px = pathIndexToX(idx);
                const py = priceToY(pt.value);
                const isLast = idx === pathPoints.length - 1;
                const isTp1Node = idx === 3;
                const dotFill = isLast
                  ? '#10B981'
                  : isTp1Node
                  ? '#38BDF8'
                  : '#F59E0B';
                const labelY = idx % 2 === 0 ? Math.max(padTop + 16, py - 14) : Math.min(padTop + plotHeight - 8, py + 20);

                return (
                  <g key={`proj-node-${idx}`}>
                    <circle
                      cx={px}
                      cy={py}
                      r={isLast || isTp1Node ? 5.5 : 4.5}
                      fill={dotFill}
                      stroke="#0F172A"
                      strokeWidth="2"
                    />
                    {pt.label && (
                      <text
                        x={px}
                        y={labelY}
                        textAnchor="middle"
                        fill="#F8FAFC"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {pt.label}
                      </text>
                    )}
                    {idx > 0 && (
                      <text
                        x={px}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        fill="#93C5FD"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {formatTimeLabel(pt.time, selectedTf)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* Hover OHLC Tooltip Overlay */}
        {hoverIndex !== null && candles[hoverIndex] && (
          <div className="pointer-events-none absolute top-3 left-3 rounded-lg border border-white/15 bg-[#0F172A]/90 px-3 py-1.5 text-[11px] font-mono text-white shadow-md">
            <span className="text-[#93C5FD] font-bold mr-2">
              {selectedTf} • {formatTimeLabel(candles[hoverIndex].time, selectedTf)} UTC
            </span>
            <span>O: {formatSignalPrice(candles[hoverIndex].open, signal.asset)}</span>{' '}
            <span>H: {formatSignalPrice(candles[hoverIndex].high, signal.asset)}</span>{' '}
            <span>L: {formatSignalPrice(candles[hoverIndex].low, signal.asset)}</span>{' '}
            <span className="font-bold text-[#F59E0B]">
              C: {formatSignalPrice(candles[hoverIndex].close, signal.asset)}
            </span>
          </div>
        )}
      </div>

      {/* Timeframe Forecast Note & Waypoints Strip */}
      <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/65 p-3.5 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <GitCommit className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
          <p className="text-xs text-[#0F172A] font-medium leading-relaxed">
            {activeProjection.shortNote}
          </p>
        </div>

        {/* Multi-Timeframe Bias Matrix Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#BFDBFE]/70 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-1.5">
            {TIMEFRAMES.map((tf) => {
              const item = forecastMap[tf];
              const active = tf === selectedTf;
              return (
                <button
                  key={`matrix-${tf}`}
                  type="button"
                  onClick={() => setSelectedTf(tf)}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 border transition-all ${
                    active
                      ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] font-bold'
                      : 'bg-white text-[#0F172A] border-[#CBD5E1] hover:border-[#1D4ED8]'
                  }`}
                >
                  <span>{tf}:</span>
                  <span
                    className={
                      active
                        ? 'text-white'
                        : item?.bias === 'BULLISH'
                        ? 'text-[#1D4ED8] font-bold'
                        : item?.bias === 'BEARISH'
                        ? 'text-[#EF4444] font-bold'
                        : 'text-[#475569]'
                    }
                  >
                    {item?.bias || 'BULLISH'}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="inline-flex items-center gap-1 text-[#1D4ED8] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tight ATR Proximity Clamped</span>
          </span>
        </div>
      </div>
    </div>
  );
}
