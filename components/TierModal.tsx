'use client';

import React, { useState } from 'react';
import {
  Crown,
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  X,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';

interface TierModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  onSelectTier: (tierName: string) => void;
}

export default function TierModal({
  isOpen,
  onClose,
  currentTier,
  onSelectTier,
}: TierModalProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  if (!isOpen) return null;

  const tiers = [
    {
      name: 'FREE',
      price: '$0',
      period: 'forever',
      description: 'Test the waters of Smart Money Concepts with standard chart scanning.',
      features: [
        '5 AI Chart Scans / month',
        'Standard SMC Analysis (BOS / CHOCH)',
        '1:2 Minimum Risk-to-Reward',
        'Manual Webhook Copier',
        'Community Discord Support',
      ],
      popular: false,
      cta: 'Current Plan',
    },
    {
      name: 'PRO',
      price: '$99',
      period: 'per month',
      description: 'The preferred choice for active intraday and swing traders.',
      features: [
        'Unlimited AI Vision Chart Scans',
        'Full SMC Suite: FVGs, OBs, Liquidity Pools',
        'MetaTrader 5 Automated Webhook Bridge',
        'Downloadable MQL5 Copilot EA',
        'Gemini 2.0 Flash & GPT-4o High-Precision (0.2 temp)',
        'Priority Sub-second Analysis Queue',
      ],
      popular: true,
      cta: 'Upgrade to PRO',
    },
    {
      name: 'INSTITUTIONAL',
      price: '$299',
      period: 'per month',
      description: 'Dedicated low-latency infrastructure for prop firm traders and funds.',
      features: [
        'Everything in PRO + Unlimited Sub-accounts',
        'Multi-terminal MT5 / MT4 Simultaneous Webhook',
        'Custom Dedicated Model Fine-tuning',
        'Prop Firm Risk Guard & Max Drawdown Limits',
        'Dedicated 1-on-1 Trading Architect',
        'Raw REST & WebSocket API Access',
      ],
      popular: false,
      cta: 'Access Institutional',
    },
  ];

  const handleUpgrade = (tierName: string) => {
    setLoadingTier(tierName);
    setTimeout(() => {
      onSelectTier(tierName);
      setLoadingTier(null);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl rounded-2xl bg-gradient-to-b from-[#2A1810] to-[#1E120C] border border-[#D4A373]/40 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#D4A373]/20 flex items-center justify-between bg-[#1E120C]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3D2314] border border-[#D4A373]/30 flex items-center justify-center text-[#D4A373]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F5EBE6]">
                Apex Vision AI Subscription Tiers
              </h3>
              <p className="text-xs text-[#A8968D]">
                Scale your trading edge with institutional-grade Vision AI models &amp; automated MT5 execution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#2A1810] hover:bg-[#3D2314] border border-[#D4A373]/20 flex items-center justify-center text-[#A8968D] hover:text-[#F5EBE6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((t) => {
              const isCurrent = currentTier === t.name;
              return (
                <div
                  key={t.name}
                  className={`relative rounded-2xl p-6 flex flex-col justify-between border transition-all ${
                    t.popular
                      ? 'bg-gradient-to-b from-[#3D2314] via-[#2A1810] to-[#1E120C] border-[#D4A373] shadow-gold-glow scale-[1.02]'
                      : 'bg-[#150C07] border-[#D4A373]/20 hover:border-[#D4A373]/40'
                  }`}
                >
                  {t.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#D4A373] text-[#1E120C] text-[10px] font-black uppercase tracking-widest shadow">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-black tracking-widest text-[#D4A373]">
                        {t.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-bold">
                          Active Plan
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 my-3">
                      <span className="text-3xl font-black text-[#F5EBE6]">
                        {t.price}
                      </span>
                      <span className="text-xs text-[#A8968D] font-mono">
                        /{t.period}
                      </span>
                    </div>

                    <p className="text-xs text-[#A8968D] leading-relaxed mb-6">
                      {t.description}
                    </p>

                    <div className="space-y-2.5 pb-6 border-b border-[#D4A373]/15 text-xs">
                      {t.features.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2 text-[#F5EBE6]">
                          <Check className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleUpgrade(t.name)}
                      disabled={isCurrent || loadingTier !== null}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        isCurrent
                          ? 'bg-[#2A1810] text-[#A8968D] border border-[#D4A373]/20 cursor-default'
                          : t.popular
                          ? 'btn-bronze-gold shadow-lg'
                          : 'bg-[#2A1810] hover:bg-[#3D2314] text-[#F5EBE6] border border-[#D4A373]/30 hover:border-[#D4A373]'
                      }`}
                    >
                      {loadingTier === t.name ? (
                        <>
                          <Zap className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : isCurrent ? (
                        'Active Plan'
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5 text-[#D4A373]" />
                          <span>{t.cta}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Secure Stripe Notice */}
          <div className="mt-6 pt-4 border-t border-[#D4A373]/15 flex items-center justify-between text-xs text-[#A8968D]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>256-bit encrypted checkout powered by Stripe. Cancel anytime with 1 click.</span>
            </div>
            <span className="font-mono text-[#D4A373]">
              30-Day Money-Back Guarantee
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
