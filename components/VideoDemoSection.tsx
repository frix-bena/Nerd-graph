'use client';

import React, { useEffect, useState } from 'react';
import { Play, X } from 'lucide-react';

interface VideoDemoSectionProps {
  isOpenModal: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
}

const VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const WALKTHROUGHS = [
  {
    title: '1. Upload or Paste Any Chart',
    duration: '0:45',
    caption: 'Choose an asset and timeframe, then drop in a chart screenshot or paste directly from your clipboard.',
    accent: '#D4A373',
  },
  {
    title: '2. Reading SMC Order Blocks & Entries',
    duration: '1:15',
    caption: 'Review the detected market bias, order blocks, liquidity levels, entry, stop loss, and profit targets.',
    accent: '#10B981',
  },
  {
    title: '3. Connecting Your MT5 Auto-Bridge',
    duration: '1:30',
    caption: 'See how a reviewed trade setup can be prepared for an MT5 bridge connection.',
    accent: '#C28952',
  },
];

function posterFor(title: string, accent: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#0B0B0B"/><path d="M0 430 140 360l90 28 120-150 110 75 110-150 110 45 150-120 130 40v412H0Z" fill="#2A1810"/><path d="m0 430 140-70 90 28 120-150 110 75 110-150 110 45 150-120 130 40" fill="none" stroke="${accent}" stroke-width="5"/><text x="54" y="82" fill="#F5EBE6" font-family="Arial,sans-serif" font-size="32" font-weight="700">${title}</text><text x="54" y="122" fill="${accent}" font-family="monospace" font-size="18">APEX VISION AI · WALKTHROUGH</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function VideoDemoSection({ isOpenModal, onCloseModal, onOpenModal }: VideoDemoSectionProps) {
  const [activeVideo, setActiveVideo] = useState(0);

  useEffect(() => {
    if (!isOpenModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenModal, onCloseModal]);

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4A373]">Walkthroughs</p>
          <h2 className="mt-1 text-lg font-bold text-[#F5EBE6]">🎥 How It Works</h2>
        </div>
        <button type="button" onClick={onOpenModal} className="text-xs text-[#D4A373] hover:text-[#F5EBE6]">Watch a walkthrough →</button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {WALKTHROUGHS.map((video, index) => (
          <button key={video.title} type="button" onClick={() => { setActiveVideo(index); onOpenModal(); }}
            className="group chocolate-card chocolate-card-hover overflow-hidden rounded-xl text-left">
            <div className="relative aspect-[16/8] overflow-hidden bg-[#0B0B0B]">
              <img src={posterFor(video.title, video.accent)} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D4A373]/70 bg-[#1E120C]/90 text-[#D4A373]"><Play className="ml-0.5 h-4 w-4 fill-current" /></span>
              </span>
              <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono text-white">{video.duration}</span>
            </div>
            <div className="p-3.5">
              <p className="text-sm font-semibold text-[#F5EBE6]">{video.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#A8968D]">{video.caption}</p>
            </div>
          </button>
        ))}
      </div>

      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseModal(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="walkthrough-title" className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#D4A373]/35 bg-[#1E120C] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D4A373]/20 px-4 py-3 sm:px-5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#D4A373]">Apex Vision AI · Video guide</p>
                <h3 id="walkthrough-title" className="mt-1 text-sm font-bold text-[#F5EBE6]">{WALKTHROUGHS[activeVideo].title}</h3>
              </div>
              <button type="button" onClick={onCloseModal} aria-label="Close video" className="rounded-lg border border-[#D4A373]/20 p-2 text-[#A8968D] hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <video key={activeVideo} className="aspect-video w-full bg-black" controls playsInline preload="metadata" poster={posterFor(WALKTHROUGHS[activeVideo].title, WALKTHROUGHS[activeVideo].accent)}>
              <source src={VIDEO_URL} type="video/mp4" />
              Your browser does not support HTML5 video.
            </video>
            <div className="p-4 sm:p-5">
              <p className="text-sm leading-relaxed text-[#A8968D]">{WALKTHROUGHS[activeVideo].caption}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {WALKTHROUGHS.map((video, index) => (
                  <button key={video.title} type="button" onClick={() => setActiveVideo(index)} className={`rounded-lg border px-3 py-2 text-left text-xs transition ${activeVideo === index ? 'border-[#D4A373]/60 bg-[#2A1810] text-[#F5EBE6]' : 'border-[#D4A373]/15 text-[#A8968D] hover:border-[#D4A373]/40'}`}>
                    <span className="block font-semibold">{video.title}</span><span className="mt-1 block font-mono text-[10px] text-[#D4A373]">{video.duration}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
