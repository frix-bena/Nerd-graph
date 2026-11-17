'use client';

import React, { useState } from 'react';
import {
  Terminal,
  Download,
  Copy,
  CheckCircle2,
  X,
  Zap,
  ShieldCheck,
  Code2,
  Server,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';
import { SMCSignalOutput } from '@/lib/types';

interface ExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSignal?: SMCSignalOutput | null;
  onExecuteTest: () => Promise<void>;
  isExecuting: boolean;
  lastExecutionMsg?: string | null;
}

export default function ExecutionModal({
  isOpen,
  onClose,
  activeSignal,
  onExecuteTest,
  isExecuting,
  lastExecutionMsg,
}: ExecutionModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/mt5/webhook`
    : 'https://apexvisionai.io/api/mt5/webhook';

  const webhookSecret = 'apex_live_sec_9934af89';

  const samplePayload = {
    action: 'POLL_OR_EXECUTE',
    symbol: activeSignal?.asset || 'XAUUSD',
    type: activeSignal?.trade_recommendation || 'BUY',
    lotSize: 0.5,
    entryPrice: activeSignal?.entry_price || 2652.4,
    stopLoss: activeSignal?.stop_loss || 2641.8,
    takeProfit1: activeSignal?.take_profit_1 || 2673.5,
    takeProfit2: activeSignal?.take_profit_2 || 2695.0,
    webhookSecret,
  };

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-2xl bg-gradient-to-b from-[#2A1810] to-[#1E120C] border border-[#D4A373]/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D4A373]/20 flex items-center justify-between bg-[#1E120C]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3D2314] border border-[#D4A373]/30 flex items-center justify-center text-[#D4A373]">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5EBE6]">
                MetaTrader 4 / 5 Auto-Execution Bridge
              </h3>
              <p className="text-xs text-[#A8968D]">
                Connect your MT4/MT5 terminal to execute institutional SMC signals in real-time
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Step Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#150C07] border border-[#D4A373]/20 text-xs">
              <span className="font-mono text-[#D4A373] font-black">STEP 1</span>
              <p className="font-bold text-[#F5EBE6] mt-1">Download EA</p>
              <p className="text-[#A8968D] mt-0.5 text-[11px]">
                Download <code>ApexVisionAI_Copilot.mq5</code> and place in MT5 Experts folder.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#150C07] border border-[#D4A373]/20 text-xs">
              <span className="font-mono text-[#D4A373] font-black">STEP 2</span>
              <p className="font-bold text-[#F5EBE6] mt-1">Allow WebRequest</p>
              <p className="text-[#A8968D] mt-0.5 text-[11px]">
                In MT5 Options -&gt; Expert Advisors, enable WebRequest for your server URL.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#150C07] border border-[#D4A373]/20 text-xs">
              <span className="font-mono text-[#10B981] font-black">STEP 3</span>
              <p className="font-bold text-[#F5EBE6] mt-1">Auto-Execute</p>
              <p className="text-[#A8968D] mt-0.5 text-[11px]">
                Attach EA to any chart. Verified SMC setups execute with exact SL &amp; TP.
              </p>
            </div>
          </div>

          {/* Webhook Endpoint Box */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-[#A8968D] flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>Webhook API Endpoint</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#150C07] border border-[#D4A373]/30 text-xs font-mono text-[#F5EBE6] focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, setCopiedUrl)}
                className="px-3.5 py-2.5 rounded-xl bg-[#2A1810] hover:bg-[#3D2314] text-xs font-bold text-[#D4A373] border border-[#D4A373]/30 flex items-center gap-1.5"
              >
                {copiedUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Secret Token */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-[#A8968D] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Secret Auth Token (x-apex-secret)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookSecret}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#150C07] border border-[#D4A373]/30 text-xs font-mono text-[#A8968D] focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(webhookSecret, setCopiedSecret)}
                className="px-3.5 py-2.5 rounded-xl bg-[#2A1810] hover:bg-[#3D2314] text-xs font-bold text-[#D4A373] border border-[#D4A373]/30 flex items-center gap-1.5"
              >
                {copiedSecret ? <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Download EA Script CTA */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#3D2314] to-[#2A1810] border border-[#D4A373]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#F5EBE6]">
                Download Pre-Configured MQL5 Expert Advisor
              </p>
              <p className="text-xs text-[#A8968D] mt-0.5">
                Includes automated lot calculation, slippage protection, and split TP1/TP2 execution.
              </p>
            </div>
            <a
              href="/api/mt5/ea"
              download="ApexVisionAI_Copilot.mq5"
              className="px-4 py-2.5 rounded-xl btn-bronze-gold text-xs font-bold flex items-center gap-2 shadow-lg flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>Download .mq5 EA</span>
            </a>
          </div>

          {/* JSON Payload Inspector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#A8968D] flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-[#D4A373]" />
                <span>MT5 Webhook Payload Preview</span>
              </span>
              <button
                onClick={() =>
                  copyToClipboard(JSON.stringify(samplePayload, null, 2), setCopiedCode)
                }
                className="text-xs text-[#D4A373] hover:underline flex items-center gap-1"
              >
                {copiedCode ? '✓ Copied' : 'Copy JSON'}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-[#0E0805] border border-[#D4A373]/20 text-[11px] font-mono text-[#D4A373] overflow-x-auto leading-relaxed">
              {JSON.stringify(samplePayload, null, 2)}
            </pre>
          </div>

          {/* Test Signal Execution Ping */}
          <div className="p-4 rounded-xl bg-[#150C07] border border-[#10B981]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#F5EBE6] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                Live Terminal Test Dispatch
              </p>
              <p className="text-[11px] text-[#A8968D] mt-0.5">
                {lastExecutionMsg ||
                  'Send a simulated webhook execution packet to MetaQuotes-Demo'}
              </p>
            </div>

            <button
              onClick={onExecuteTest}
              disabled={isExecuting}
              className="px-4 py-2 rounded-xl bg-[#10B981]/20 hover:bg-[#10B981]/30 border border-[#10B981] text-xs font-bold text-[#10B981] flex items-center gap-1.5 transition-all flex-shrink-0"
            >
              {isExecuting ? (
                <>
                  <Zap className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Send Test Execution</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#D4A373]/20 bg-[#1E120C]/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#2A1810] hover:bg-[#3D2314] text-xs font-bold text-[#F5EBE6] border border-[#D4A373]/20"
          >
            Close Bridge Settings
          </button>
        </div>
      </div>
    </div>
  );
}
