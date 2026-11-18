'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SMCSignalOutput, VisualProofZone, formatSignalPrice } from '@/lib/types';
import {
  Eye,
  EyeOff,
  Layers,
  Crosshair,
  GitCommit,
  BoxSelect,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  RotateCcw,
  X,
} from 'lucide-react';

interface InteractiveChartOverlayProps {
  imageUrl: string;
  signal: SMCSignalOutput;
}

function getZoneStyles(type: VisualProofZone['type']) {
  switch (type) {
    case 'FVG':
    case 'SUPPORT':
      return {
        box: 'bg-[#DBEAFE]/55 border-[#1D4ED8] border-dashed',
        badge: 'bg-[#1D4ED8] text-white border-[#0F172A]',
        svgFill: 'rgba(219, 234, 254, 0.45)',
        svgStroke: '#1D4ED8',
        svgDash: '6 4',
        canvasFill: 'rgba(219, 234, 254, 0.55)',
        canvasStroke: '#1D4ED8',
        canvasDash: [8, 6],
        badgeBg: '#1D4ED8',
        badgeText: '#FFFFFF',
      };
    case 'OB':
    case 'SUPPLY_DEMAND':
      return {
        box: 'bg-[#FEF3C7]/60 border-[#F59E0B] border-solid',
        badge: 'bg-[#F59E0B] text-[#0F172A] border-[#0F172A]',
        svgFill: 'rgba(254, 243, 199, 0.48)',
        svgStroke: '#F59E0B',
        svgDash: '5 3',
        canvasFill: 'rgba(254, 243, 199, 0.60)',
        canvasStroke: '#F59E0B',
        canvasDash: [],
        badgeBg: '#F59E0B',
        badgeText: '#0F172A',
      };
    case 'LIQUIDITY':
    case 'RESISTANCE':
      return {
        box: 'bg-[#FEF2F2]/60 border-[#EF4444] border-dashed',
        badge: 'bg-[#EF4444] text-white border-[#0F172A]',
        svgFill: 'rgba(254, 242, 242, 0.48)',
        svgStroke: '#EF4444',
        svgDash: '6 4',
        canvasFill: 'rgba(254, 242, 242, 0.60)',
        canvasStroke: '#EF4444',
        canvasDash: [8, 6],
        badgeBg: '#EF4444',
        badgeText: '#FFFFFF',
      };
    case 'BOS':
    default:
      return {
        box: 'bg-[#EFF6FF]/50 border-[#0F172A] border-dashed',
        badge: 'bg-[#0F172A] text-white border-[#0F172A]',
        svgFill: 'rgba(239, 246, 255, 0.42)',
        svgStroke: '#0F172A',
        svgDash: '5 4',
        canvasFill: 'rgba(239, 246, 255, 0.50)',
        canvasStroke: '#0F172A',
        canvasDash: [8, 6],
        badgeBg: '#0F172A',
        badgeText: '#FFFFFF',
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isDownloading, setIsDownloading] = useState(false);

  const resolvedImageUrl = imageUrl || signal.chartImageUrl || '';
  const annotations = signal.visual_proof_annotations;

  const entryY =
    signal.entry_y ?? annotations?.entry_y ?? annotations?.entry_y_percent ?? 62;
  const slY =
    signal.stop_loss_y ??
    annotations?.stop_loss_y ??
    annotations?.stop_loss_y_percent ??
    80;
  const tp1Y =
    signal.tp1_y ?? annotations?.tp1_y ?? annotations?.tp1_y_percent ?? 35;
  const tp2Y =
    signal.tp2_y ?? annotations?.tp2_y ?? annotations?.tp2_y_percent ?? 18;
  const isBullish =
    signal.trade_recommendation === 'BUY' ||
    (signal.trade_recommendation !== 'SELL' && signal.bias !== 'BEARISH');
  const tp3Y =
    signal.tp3_y ??
    annotations?.tp3_y ??
    annotations?.tp3_y_percent ??
    (isBullish ? Math.max(6, tp2Y - 8) : Math.min(94, tp2Y + 8));
  const tp3Price = Number(signal.take_profit_3 ?? signal.trade_execution?.take_profit_3 ?? 0);

  const rawZones =
    (Array.isArray(signal.zones) && signal.zones.length > 0
      ? signal.zones
      : annotations?.zones) ?? [];

  const zones = rawZones.map((z) => ({
    ...z,
    x_start: z.x_start ?? z.x_start_percent ?? 25,
    y_start: z.y_start ?? z.y_start_percent ?? 50,
    x_end: z.x_end ?? z.x_end_percent ?? 78,
    y_end: z.y_end ?? z.y_end_percent ?? 62,
    label: z.label || z.type || 'Key Zone',
    type: z.type || 'FVG',
  }));

  const rawPath =
    (Array.isArray(signal.prediction_path) && signal.prediction_path.length > 0
      ? signal.prediction_path
      : annotations?.prediction_path) ?? [];

  const predictionPath = rawPath.map((pt) => ({
    x: pt.x ?? pt.x_percent ?? 50,
    y: pt.y ?? pt.y_percent ?? 50,
    label: pt.label ?? pt.note ?? '',
  }));

  const priceLines = [
    ...(tp3Price > 0
      ? [
          {
            id: 'tp3',
            label: `TP3: ${formatSignalPrice(tp3Price, signal.asset)}`,
            yPercent: tp3Y,
            lineClass: 'border-b-2 border-dashed border-[#0F172A]',
            badgeClass: 'bg-[#0F172A] border-[#1D4ED8] text-white',
            strokeColor: '#0F172A',
            dashed: true,
            badgeBg: '#0F172A',
            badgeBorder: '#1D4ED8',
            badgeText: '#FFFFFF',
          },
        ]
      : []),
    {
      id: 'tp2',
      label: `TP2: ${formatSignalPrice(signal.take_profit_2, signal.asset)}`,
      yPercent: tp2Y,
      lineClass: 'border-b-2 border-dashed border-[#1D4ED8]',
      badgeClass: 'bg-[#1D4ED8] border-[#0F172A] text-white',
      strokeColor: '#1D4ED8',
      dashed: true,
      badgeBg: '#1D4ED8',
      badgeBorder: '#0F172A',
      badgeText: '#FFFFFF',
    },
    {
      id: 'tp1',
      label: `TP1: ${formatSignalPrice(signal.take_profit_1, signal.asset)}`,
      yPercent: tp1Y,
      lineClass: 'border-b-2 border-dashed border-[#2563EB]',
      badgeClass: 'bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]',
      strokeColor: '#2563EB',
      dashed: true,
      badgeBg: '#EFF6FF',
      badgeBorder: '#1D4ED8',
      badgeText: '#1D4ED8',
    },
    {
      id: 'entry',
      label: `ENTRY: ${formatSignalPrice(signal.entry_price, signal.asset)}`,
      yPercent: entryY,
      lineClass: 'border-b-2 border-dashed border-[#F59E0B]',
      badgeClass: 'bg-[#FEF3C7] border-[#0F172A] text-[#0F172A] font-extrabold',
      strokeColor: '#F59E0B',
      dashed: true,
      badgeBg: '#FEF3C7',
      badgeBorder: '#0F172A',
      badgeText: '#0F172A',
      isEntry: true,
    },
    {
      id: 'sl',
      label: `SL: ${formatSignalPrice(signal.stop_loss, signal.asset)}`,
      yPercent: slY,
      lineClass: 'border-b-2 border-dashed border-[#EF4444]',
      badgeClass: 'bg-[#FEF2F2] border-[#EF4444] text-[#EF4444]',
      strokeColor: '#EF4444',
      dashed: true,
      badgeBg: '#FEF2F2',
      badgeBorder: '#EF4444',
      badgeText: '#EF4444',
    },
  ];

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === '+' || e.key === '=') {
        setZoomScale((prev) => Math.min(2.5, Number((prev + 0.25).toFixed(2))));
      } else if (e.key === '-') {
        setZoomScale((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))));
      } else if (e.key === '0') {
        setZoomScale(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  const handleOpenLightbox = () => {
    if (!resolvedImageUrl) return;
    setZoomScale(1);
    setIsLightboxOpen(true);
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(2.5, Number((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
  };

  const handleModalImageClick = () => {
    setZoomScale((prev) => (prev > 1 ? 1 : prev === 1 ? 0.75 : 1));
  };

  const handleDownloadProof = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!resolvedImageUrl || isDownloading) return;

      setIsDownloading(true);
      const filename = `${(signal.asset || 'chart').toLowerCase()}-${(
        signal.timeframe || 'tf'
      ).toLowerCase()}-smc-proof.png`;

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load chart image for export'));
          img.src = resolvedImageUrl;
        });

        const width = 1600;
        const height = 1000;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        if (showOverlays) {
          if (showZones) {
            zones.forEach((zone) => {
              const leftPct = Math.min(zone.x_start, zone.x_end);
              const topPct = Math.min(zone.y_start, zone.y_end);
              const widthPct = Math.max(4, Math.abs(zone.x_end - zone.x_start));
              const heightPct = Math.max(2.5, Math.abs(zone.y_end - zone.y_start));

              const x = (leftPct / 100) * width;
              const y = (topPct / 100) * height;
              const w = (widthPct / 100) * width;
              const h = (heightPct / 100) * height;
              const styles = getZoneStyles(zone.type);

              ctx.save();
              ctx.fillStyle = styles.canvasFill;
              ctx.strokeStyle = styles.canvasStroke;
              ctx.lineWidth = 3;
              ctx.setLineDash(styles.canvasDash);
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, 8);
              ctx.fill();
              ctx.stroke();
              ctx.restore();

              const badgeText = `${zone.type} · ${zone.label}`;
              ctx.save();
              ctx.font = 'bold 16px monospace';
              const textMetrics = ctx.measureText(badgeText);
              const badgeW = textMetrics.width + 20;
              const badgeH = 28;
              const badgeX = x + 8;
              const badgeY = Math.max(8, y - badgeH / 2);

              ctx.fillStyle = styles.badgeBg;
              ctx.strokeStyle = '#0F172A';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = styles.badgeText;
              ctx.textBaseline = 'middle';
              ctx.fillText(badgeText, badgeX + 10, badgeY + badgeH / 2);
              ctx.restore();
            });
          }

          if (showPath && predictionPath.length >= 2) {
            ctx.save();
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            predictionPath.forEach((pt, idx) => {
              const px = (pt.x / 100) * width;
              const py = (pt.y / 100) * height;
              if (idx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.stroke();

            ctx.strokeStyle = '#1D4ED8';
            ctx.lineWidth = 3.5;
            ctx.setLineDash([12, 8]);
            ctx.stroke();
            ctx.restore();

            predictionPath.forEach((pt) => {
              const px = (pt.x / 100) * width;
              const py = (pt.y / 100) * height;

              ctx.save();
              ctx.fillStyle = '#F59E0B';
              ctx.strokeStyle = '#0F172A';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(px, py, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              if (pt.label) {
                ctx.font = 'bold 14px monospace';
                const noteW = ctx.measureText(pt.label).width + 16;
                const noteH = 24;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.beginPath();
                ctx.roundRect(px - noteW / 2, py + 12, noteW, noteH, 5);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.textBaseline = 'middle';
                ctx.fillText(pt.label, px - noteW / 2 + 8, py + 12 + noteH / 2);
              }
              ctx.restore();
            });
          }

          priceLines.forEach((line) => {
            const clampedY = Math.min(96, Math.max(4, line.yPercent));
            const y = (clampedY / 100) * height;

            ctx.save();
            ctx.font = 'bold 17px monospace';
            const badgeW = ctx.measureText(line.label).width + 24;
            const badgeH = 30;
            const lineStartX = 24;
            const badgeRightX = width - 24;
            const badgeLeftX = badgeRightX - badgeW;

            ctx.strokeStyle = line.strokeColor;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 8]);
            ctx.beginPath();
            ctx.moveTo(lineStartX, y);
            ctx.lineTo(badgeLeftX - 10, y);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.fillStyle = line.badgeBg;
            ctx.strokeStyle = line.badgeBorder;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(badgeLeftX, y - badgeH / 2, badgeW, badgeH, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = line.badgeText;
            ctx.textBaseline = 'middle';
            ctx.fillText(line.label, badgeLeftX + 12, y);
            ctx.restore();
          });
        }

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        const link = document.createElement('a');
        link.href = resolvedImageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        setIsDownloading(false);
      }
    },
    [
      resolvedImageUrl,
      isDownloading,
      signal.asset,
      signal.timeframe,
      showOverlays,
      showZones,
      showPath,
      zones,
      predictionPath,
      priceLines,
    ]
  );

  const renderOverlays = () => {
    if (!showOverlays) return null;
    return (
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {/* Responsive SVG viewBox="0 0 100 100" preserveAspectRatio="none" layered directly over <img> */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full overflow-visible"
          aria-label="Visual Proof Chart Overlay"
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

          {/* 1. Shaded Zone Boxes (FVG / Order Block / Key Support-Resistance zones) */}
          {showZones &&
            zones.map((zone, idx) => {
              const left = Math.min(zone.x_start, zone.x_end);
              const top = Math.min(zone.y_start, zone.y_end);
              const width = Math.max(4, Math.abs(zone.x_end - zone.x_start));
              const height = Math.max(2.5, Math.abs(zone.y_end - zone.y_start));
              const styles = getZoneStyles(zone.type);

              return (
                <g key={`svg-zone-${idx}`}>
                  <rect
                    x={left}
                    y={top}
                    width={width}
                    height={height}
                    rx="0.6"
                    fill={styles.svgFill}
                    stroke={styles.svgStroke}
                    strokeWidth="2"
                    strokeDasharray={styles.svgDash}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={left + 1}
                    y={Math.max(3, top + 2.5)}
                    fontSize="2.2"
                    fill={styles.svgStroke}
                    fillOpacity="0"
                  >
                    {zone.label}
                  </text>
                </g>
              );
            })}

          {/* 2. Horizontal Dashed Lines for Entry, Stop Loss, TP1, and TP2 */}
          {priceLines.map((line) => {
            const clampedY = Math.min(96, Math.max(4, line.yPercent));
            return (
              <g key={`svg-line-${line.id}`}>
                <line
                  x1="0"
                  y1={clampedY}
                  x2="100"
                  y2={clampedY}
                  stroke={line.strokeColor}
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x="2"
                  y={Math.max(3, clampedY - 1)}
                  fontSize="2.2"
                  fill={line.strokeColor}
                  fillOpacity="0"
                >
                  {line.label}
                </text>
              </g>
            );
          })}

          {/* 3. Dashed Trajectory Arrow (prediction_path) */}
          {showPath && predictionPath.length >= 2 && (
            <g>
              <polyline
                fill="none"
                stroke="#0F172A"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                points={predictionPath.map((pt) => `${pt.x},${pt.y}`).join(' ')}
              />
              <polyline
                fill="none"
                stroke="#1D4ED8"
                strokeWidth="2.2"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd="url(#smc-arrow)"
                vectorEffect="non-scaling-stroke"
                points={predictionPath.map((pt) => `${pt.x},${pt.y}`).join(' ')}
              />
              {predictionPath.map((pt, idx) => (
                <g key={`svg-path-node-${idx}`}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="0.9"
                    fill="#F59E0B"
                    stroke="#0F172A"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  {pt.label && (
                    <text
                      x={pt.x}
                      y={Math.min(98, pt.y + 3)}
                      fontSize="2"
                      fill="#0F172A"
                      fillOpacity="0"
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              ))}
            </g>
          )}
        </svg>

        {/* Crisp HTML Badges for Zones */}
        {showZones &&
          zones.map((zone, idx) => {
            const left = Math.min(zone.x_start, zone.x_end);
            const top = Math.min(zone.y_start, zone.y_end);
            const styles = getZoneStyles(zone.type);

            return (
              <div
                key={`zone-badge-${zone.type}-${idx}`}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                }}
                className="absolute -translate-y-2.5 translate-x-1"
              >
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold border shadow-sm whitespace-nowrap ${styles.badge}`}
                >
                  <span>{zone.type}</span>
                  <span className="opacity-75">·</span>
                  <span>{zone.label}</span>
                </span>
              </div>
            );
          })}

        {/* Crisp HTML Nodes & Labels for Prediction Path */}
        {showPath &&
          predictionPath.length >= 2 &&
          predictionPath.map((pt, idx) => (
            <div
              key={`path-pt-${idx}`}
              style={{
                left: `${pt.x}%`,
                top: `${pt.y}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] border-2 border-[#0F172A] shadow" />
              {pt.label && (
                <span className="mt-1 px-1.5 py-0.5 rounded bg-[#0F172A]/90 text-white font-mono text-[9px] font-bold whitespace-nowrap shadow">
                  {pt.label}
                </span>
              )}
            </div>
          ))}

        {/* Crisp Right-Aligned Price Badges for Entry, Stop Loss, TP1, TP2 */}
        {priceLines.map((line) => (
          <div
            key={`badge-${line.id}`}
            style={{ top: `${Math.min(96, Math.max(4, line.yPercent))}%` }}
            className="absolute right-2 sm:right-3 -translate-y-1/2 flex items-center"
          >
            <span
              className={`px-2 py-0.5 rounded-md border font-mono text-[10px] sm:text-[11px] font-bold shadow-sm flex items-center gap-1 whitespace-nowrap ${line.badgeClass}`}
            >
              {line.isEntry && <Crosshair className="w-3 h-3 text-[#F59E0B]" />}
              {line.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="relative w-full rounded-2xl bg-white border border-[#CBD5E1] overflow-hidden shadow-saas-card group">
        {/* Chart Image & Visual Proof Coordinate Canvas */}
        <div
          role={resolvedImageUrl ? 'button' : undefined}
          tabIndex={resolvedImageUrl ? 0 : undefined}
          aria-label={resolvedImageUrl ? 'Click chart proof image to zoom or download' : undefined}
          onClick={handleOpenLightbox}
          onKeyDown={(e) => {
            if (resolvedImageUrl && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleOpenLightbox();
            }
          }}
          className={`relative w-full aspect-[16/10] bg-[#F8FAFC] flex items-center justify-center overflow-hidden ${
            resolvedImageUrl ? 'cursor-zoom-in' : ''
          }`}
        >
          {resolvedImageUrl ? (
            <>
              <img
                src={resolvedImageUrl}
                alt="Uploaded Financial Chart Proof"
                className="w-full h-full object-fill select-none block"
              />

              {/* Hover Quick Action Badge on Image */}
              <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-lg border border-[#0F172A]/15 bg-[#0F172A]/85 px-2.5 py-1 text-[11px] font-medium text-white opacity-90 shadow-sm transition-opacity group-hover:opacity-100">
                <Maximize2 className="h-3 w-3 text-[#93C5FD]" />
                <span>Click image to zoom or download</span>
              </div>
            </>
          ) : (
            <div className="text-center p-8 text-[#475569]">
              <Layers className="w-12 h-12 mx-auto text-[#1D4ED8]/50 mb-2" />
              <p className="text-sm">No chart loaded</p>
            </div>
          )}

          {/* Normalized Coordinate Visual Proof Overlays (0-100%) */}
          {renderOverlays()}
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

            {resolvedImageUrl && (
              <>
                <button
                  type="button"
                  onClick={handleOpenLightbox}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#0F172A] hover:text-[#1D4ED8] border border-[#CBD5E1] font-medium transition-all"
                  title="Open zoom view"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  <span>Zoom</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadProof}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white border border-[#1D4ED8] font-semibold transition-all disabled:opacity-60"
                  title="Download chart proof image"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloading ? 'Saving…' : 'Download'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Lightbox Modal for Zooming In/Out & Downloading Image Proof */}
      {isLightboxOpen && resolvedImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chart Visual Proof Zoom Viewer"
          className="fixed inset-0 z-50 flex flex-col bg-[#0F172A]/90 backdrop-blur-sm"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Modal Control Bar */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-[#0F172A] px-4 py-3 text-xs text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 font-mono">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
              <span className="font-bold text-sm">{signal.asset}</span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-[#93C5FD]">
                {signal.timeframe}
              </span>
              <span className="hidden text-white/70 sm:inline">
                · Click image to zoom out / toggle scale
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-white/20 bg-white/10 p-0.5">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 0.5}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-40"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Zoom Out</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2.5 py-1 font-mono text-xs font-bold text-[#93C5FD] hover:text-white"
                  title="Reset Zoom (100%)"
                >
                  {Math.round(zoomScale * 100)}%
                </button>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomScale >= 2.5}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-40"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Zoom In</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="rounded-md px-2 py-1 text-white/80 hover:bg-white/15 hover:text-white"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowOverlays(!showOverlays)}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-medium text-white hover:bg-white/20"
              >
                {showOverlays ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-[#93C5FD]" />
                    <span>Hide Overlays</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 text-[#93C5FD]" />
                    <span>Show Overlays</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadProof}
                disabled={isDownloading}
                className="flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-1.5 font-bold text-white shadow hover:bg-[#2563EB] disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isDownloading ? 'Downloading…' : 'Download Image'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="flex items-center justify-center rounded-lg border border-white/20 bg-white/10 p-1.5 text-white hover:bg-[#EF4444] hover:border-[#EF4444]"
                aria-label="Close zoom view"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Zoomable Viewport Canvas */}
          <div
            className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center"
            onClick={() => setIsLightboxOpen(false)}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (e.deltaY < 0) handleZoomIn();
                else handleZoomOut();
              }
            }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleModalImageClick();
              }}
              style={{
                width: `${Math.round(zoomScale * 100)}%`,
                maxWidth: `${Math.round(zoomScale * 1100)}px`,
              }}
              className="relative aspect-[16/10] rounded-xl border-2 border-white/20 bg-[#F8FAFC] shadow-2xl overflow-hidden transition-all duration-150 cursor-zoom-out select-none"
              title="Click image to zoom out / toggle scale"
            >
              <img
                src={resolvedImageUrl}
                alt="Zoomed Financial Chart Proof"
                className="w-full h-full object-fill select-none block"
              />
              {renderOverlays()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
