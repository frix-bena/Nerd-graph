'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Filter,
  ExternalLink,
  Terminal,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import { SignalRecord } from '@/lib/types';

interface SignalHistoryProps {
  onSelectSignal: (signal: any) => void;
  refreshTrigger: number;
}

export default function SignalHistory({
  onSelectSignal,
  refreshTrigger,
}: SignalHistoryProps) {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [biasFilter, setBiasFilter] = useState('ALL');

  const fetchSignals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (assetFilter !== 'ALL') params.set('asset', assetFilter);
      if (biasFilter !== 'ALL') params.set('bias', biasFilter);

      const res = await fetch(`/api/signals?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSignals(data.signals || []);
      }
    } catch (e) {
      console.error('Failed to load signals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [refreshTrigger, assetFilter, biasFilter]);

  return (
    <div className="w-full rounded-2xl bg-gradient-to-b from-[#2A1810] to-[#1E120C] border border-[#D4A373]/30 p-6 shadow-card-lux space-y-5">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#D4A373]/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3D2314] border border-[#D4A373]/30 flex items-center justify-center text-[#D4A373]">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#F5EBE6]">
              Automated Signal History &amp; MT5 Log
            </h3>
            <p className="text-xs text-[#A8968D]">
              Historical Smart Money Concepts setups stored in PostgreSQL / SQLite
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Asset filter */}
          <select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#150C07] border border-[#D4A373]/25 text-xs text-[#F5EBE6] focus:outline-none"
          >
            <option value="ALL">All Assets</option>
            <option value="XAUUSD">XAUUSD (Gold)</option>
            <option value="BTCUSDT">BTCUSDT (Crypto)</option>
            <option value="EURUSD">EURUSD (Forex)</option>
            <option value="US30">US30 (Dow Jones)</option>
          </select>

          {/* Bias filter */}
          <select
            value={biasFilter}
            onChange={(e) => setBiasFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#150C07] border border-[#D4A373]/25 text-xs text-[#F5EBE6] focus:outline-none"
          >
            <option value="ALL">All Biases</option>
            <option value="BULLISH">Bullish (Buy)</option>
            <option value="BEARISH">Bearish (Sell)</option>
          </select>
        </div>
      </div>

      {/* Signals List / Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#A8968D]">
          Loading historical signals...
        </div>
      ) : signals.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#A8968D]">
          No signals found. Upload a chart above to generate your first setup!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D4A373]/15 text-[#A8968D] font-mono text-[11px] uppercase tracking-wider">
                <th className="pb-3 font-semibold">Asset / TF</th>
                <th className="pb-3 font-semibold">Action &amp; Bias</th>
                <th className="pb-3 font-semibold">Entry Level</th>
                <th className="pb-3 font-semibold">Stop Loss</th>
                <th className="pb-3 font-semibold">TP1 / TP2</th>
                <th className="pb-3 font-semibold">RRR</th>
                <th className="pb-3 font-semibold">MT5 Ticket</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D4A373]/10">
              {signals.map((sig) => {
                const isBuy = sig.tradeRecommendation === 'BUY' || sig.trade_recommendation === 'BUY';
                return (
                  <tr
                    key={sig.id}
                    onClick={() => onSelectSignal(sig)}
                    className="group hover:bg-[#3D2314]/40 transition-colors cursor-pointer"
                  >
                    {/* Asset & Timeframe */}
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F5EBE6] group-hover:text-[#D4A373] transition-colors">
                          {sig.asset}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#150C07] text-[#D4A373] font-mono text-[10px] border border-[#D4A373]/20">
                          {sig.timeframe}
                        </span>
                      </div>
                    </td>

                    {/* Action & Bias */}
                    <td className="py-3.5 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                          isBuy
                            ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                        }`}
                      >
                        {isBuy ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {sig.tradeRecommendation || sig.trade_recommendation}
                      </span>
                    </td>

                    {/* Entry */}
                    <td className="py-3.5 pr-4 font-mono text-[#F5EBE6]">
                      {Number(sig.entryPrice || sig.entry_price).toLocaleString()}
                    </td>

                    {/* SL */}
                    <td className="py-3.5 pr-4 font-mono text-[#EF4444]">
                      {Number(sig.stopLoss || sig.stop_loss).toLocaleString()}
                    </td>

                    {/* TP1 & TP2 */}
                    <td className="py-3.5 pr-4 font-mono text-[#10B981]">
                      {Number(sig.takeProfit1 || sig.take_profit_1).toLocaleString()}{' '}
                      <span className="text-[#A8968D]">/</span>{' '}
                      {Number(sig.takeProfit2 || sig.take_profit_2).toLocaleString()}
                    </td>

                    {/* RRR */}
                    <td className="py-3.5 pr-4 font-mono font-bold text-[#D4A373]">
                      {sig.riskRewardRatio || sig.risk_reward_ratio}
                    </td>

                    {/* MT5 Ticket */}
                    <td className="py-3.5 pr-4 font-mono text-xs">
                      {sig.executions?.[0]?.mt5Ticket ? (
                        <span className="text-[#10B981] flex items-center gap-1">
                          <Terminal className="w-3 h-3" />
                          {sig.executions[0].mt5Ticket}
                        </span>
                      ) : sig.mt5Executed ? (
                        <span className="text-[#10B981]">#FILLED</span>
                      ) : (
                        <span className="text-[#A8968D]">Pending</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          sig.status === 'HIT_TP1' || sig.status === 'HIT_TP2'
                            ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                            : sig.status === 'STOPPED'
                            ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                            : 'bg-[#D4A373]/20 text-[#D4A373] border border-[#D4A373]/40'
                        }`}
                      >
                        {sig.status}
                      </span>
                    </td>

                    {/* Action View */}
                    <td className="py-3.5 text-right font-medium text-[#D4A373] group-hover:underline">
                      <span className="inline-flex items-center gap-1">
                        View <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
