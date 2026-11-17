'use client';

import React, { useState } from 'react';
import { SMCSignalOutput, VisualProofZone } from '@/lib/types';
import { Eye, EyeOff, Layers, Crosshair, GitCommit, BoxSelect } from 'lucide-react';

interface InteractiveChartOverlayProps {
  imageUrl: string;
  signal: SMCSignalOutput;
}

function getZoneStyles(type: VisualProofZone['type']) {
  switch (type) {
    case 'FVG':
      return {
        box: 'bg-[#DBEAFE]/55 border-[#1D4ED8] border-dashed',
        badge: 'bg-[#1D4ED8] text-white border-[#0F172A]',
      };
    case 'OB':
      return {
        box: 'bg-[#FEF3C7]/60 border-[#F59E0B] border-solid',
        badge: 'bg-[#F59E0B] text-[#0F172A] border-[#0F172A]',
      };
    case 'LIQUIDITY':
      return {
        box: 'bg-[#FEF2F2]/60 border-[#EF4444] border-dashed',
        badge: 'bg-[#EF4444] text-white border-[#0F172A]',
      };
    case 'BOS':
    default:
      return {
        box: 'bg-[#EFF6FF]/50 border-[#0F172A] border-dashed',
        badge: 'bg-[#0F172A] text-white border-[#0F172A]',
      };
  }
}

export default function InteractiveChartOverlay({
  imageUrl,
  signal,
}: InteractiveChartOverlayProps) {
  const [showOverlays, setShowOverlays] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showPath, setShowPath] = useState(true);

  const annotations = signal.visual_proof_annotations;
  const entryY = annotations?.entry_y_percent ?? 62;
  const slY = annotations?.stop_loss_y_percent ?? 80;
  const tp1Y = annotations?.tp1_y_percent ?? 35;
  const tp2Y = annotations?.tp2_y_percent ?? 18;
  const zones = annotations?.zones ?? [];
  const predictionPath = annotations?.prediction_path ?? [];

  const priceLines = [
    {
      id: 'tp2',
      label: `TP2: ${signal.take_profit_2.toLocaleString()}`,
      yPercent: tp2Y,
      lineClass: 'border-b-2 border-dashed border-[#1D4ED8]',
      badgeClass: 'bg-[#1D4ED8] border-[#0F172A] text-white',
    },
    {
      id: 'tp1',
      label: `TP1: ${signal.take_profit_1.toLocaleString()}`,
      yPercent: tp1Y,
      lineClass: 'border-b-2 border-dashed border-[#2563EB]',
      badgeClass: 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]',
    },
    {
      id: 'entry',
      label: `ENTRY: ${signal.entry_price.toLocaleString()}`,
      yPercent: entryY,
      lineClass: 'h-[2px] bg-[#F59E0B]',
      badgeClass: 'bg-[#FEF3C7] border-[#0F172A] text-[#0F172A] font-extrabold',
      isEntry: true,
    },
    {
      id: 'sl',
      label: `SL: ${signal.stop_loss.toLocaleString()}`,
      yPercent: slY,
      lineClass: 'border-b-2 border-dashed border-[#EF4444]',
      badgeClass: 'bg-[#FEF2F2] border-[#EF4444] text-[#EF4444]',
    },
  ];

  return (
    <div className="relative w-full rounded-2xl bg-white border border-[#CBD5E1] overflow-hidden shadow-saas-card group">
      {/* Chart Image & Visual Proof Coordinate Canvas */}
      <div className="relative w-full aspect-[16/10] bg-[#F8FAFC] flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Uploaded Financial Chart"
            className="w-full h-full object-fill select-none"
          />
        ) : (
          <div className="text-center p-8 text-[#475569]">
            <Layers className="w-12 h-12 mx-auto text-[#1D4ED8]/50 mb-2" />
            <p className="text-sm">No chart loaded</p>
          </div>
        )}

        {/* Normalized Coordinate Visual Proof Overlays (0-100%) */}
        {showOverlays && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {/* 1. Institutional SMC Zones (FVG, OB, LIQUIDITY, BOS) */}
            {showZones &&
              zones.map((zone, idx) => {
                const left = Math.min(zone.x_start_percent, zone.x_end_percent);
                const top = Math.min(zone.y_start_percent, zone.y_end_percent);
                const width = Math.max(4, Math.abs(zone.x_end_percent - zone.x_start_percent));
                const height = Math.max(2.5, Math.abs(zone.y_end_percent - zone.y_start_percent));
                const styles = getZoneStyles(zone.type);

                return (
                  <div
                    key={`${zone.type}-${idx}`}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    className={`absolute rounded-md border-2 transition-all ${styles.box}`}
                  >
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold border shadow-sm -translate-y-2.5 translate-x-1 whitespace-nowrap ${styles.badge}`}
                    >
                      <span>{zone.type}</span>
                      <span className="opacity-75">·</span>
                      <span>{zone.label}</span>
                    </span>
                  </div>
                );
              })}

            {/* 2. Projected Price Action Path (SVG Vector Polyline & Nodes) */}
            {showPath && predictionPath.length >= 2 && (
              <>
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full overflow-visible"
                >
                  <defs>
                    <marker
                      id="smc-arrow"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="4.5"
                      markerHeight="4.5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#1D4ED8" />
                    </marker>
                  </defs>
                  <polyline
                    fill="none"
                    stroke="#0F172A"
                    strokeWidth="0.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={predictionPath
                      .map((pt) => `${pt.x_percent},${pt.y_percent}`)
                      .join(' ')}
                  />
                  <polyline
                    fill="none"
                    stroke="#1D4ED8"
                    strokeWidth="0.55"
                    strokeDasharray="1.5 1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    markerEnd="url(#smc-arrow)"
                    points={predictionPath
                      .map((pt) => `${pt.x_percent},${pt.y_percent}`)
                      .join(' ')}
                  />
                </svg>

                {predictionPath.map((pt, idx) => (
                  <div
                    key={`path-pt-${idx}`}
                    style={{
                      left: `${pt.x_percent}%`,
                      top: `${pt.y_percent}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] border-2 border-[#0F172A] shadow" />
                    {pt.note && (
                      <span className="mt-1 px-1.5 py-0.5 rounded bg-[#0F172A]/90 text-white font-mono text-[9px] font-bold whitespace-nowrap shadow">
                        {pt.note}
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* 3. Calibrated Y-Axis Execution Level Lines (Entry, SL, TP1, TP2) */}
            {priceLines.map((line) => (
              <div
                key={line.id}
                style={{ top: `${Math.min(96, Math.max(4, line.yPercent))}%` }}
                className="absolute left-0 right-0 -translate-y-1/2 px-3 sm:px-4 flex items-center gap-2"
              >
                <div className={`flex-1 ${line.lineClass}`} />
                <span
                  className={`px-2 py-0.5 rounded-md border font-mono text-[10px] sm:text-[11px] font-bold shadow-sm flex items-center gap-1 whitespace-nowrap ${line.badgeClass}`}
                >
                  {line.isEntry && <Crosshair className="w-3 h-3 text-[#F59E0B]" />}
                  {line.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overlay Controls Toolbar at Bottom of Chart */}
      <div className="px-4 py-2.5 bg-white border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#1D4ED8]" />
          <span className="text-[#0F172A] font-bold">{signal.asset}</span>
          <span className="text-[#475569]">({signal.timeframe})</span>
          <span className="text-[#1D4ED8] font-bold hidden sm:inline">
            R:R {signal.risk_reward_ratio}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {showOverlays && (
            <>
              <button
                type="button"
                onClick={() => setShowZones(!showZones)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                  showZones
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]'
                    : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1]'
                }`}
              >
                <BoxSelect className="w-3 h-3" />
                <span>Zones ({zones.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPath(!showPath)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                  showPath
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD]'
                    : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1]'
                }`}
              >
                <GitCommit className="w-3 h-3" />
                <span>Projection Path</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowOverlays(!showOverlays)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#475569] hover:text-[#1D4ED8] border border-[#CBD5E1] font-medium transition-all"
          >
            {showOverlays ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>Hide Overlays</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>Show Overlays</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
