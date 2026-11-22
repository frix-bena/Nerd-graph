'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, Session, LiveServerMessage } from '@google/genai';
import { LiveAudioManager } from '@/lib/live/audioManager';
import { LiveScreenShareManager } from '@/lib/live/screenShare';
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Radio,
  Send,
  Sparkles,
  Volume2,
  Wrench,
  X,
} from 'lucide-react';

export type LiveConnectionStatus =
  | 'Idle'
  | 'Connecting'
  | 'Live — Listening'
  | 'Agent Speaking'
  | 'Error';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'agent' | 'tool';
  text: string;
  timestamp: string;
  toolName?: string;
}

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionStateChange?: (isConnected: boolean, status: LiveConnectionStatus) => void;
}

export default function GoLiveModal({
  isOpen,
  onClose,
  onConnectionStateChange,
}: GoLiveModalProps) {
  const [status, setStatus] = useState<LiveConnectionStatus>('Idle');
  const [activeModel, setActiveModel] = useState<string>('gemini-3.8-live');
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenLabel, setScreenLabel] = useState('TradingView / MT5 Chart');
  const [framesStreamed, setFramesStreamed] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [quickPromptText, setQuickPromptText] = useState('');

  const sessionRef = useRef<Session | null>(null);
  const audioManagerRef = useRef<LiveAudioManager | null>(null);
  const screenManagerRef = useRef<LiveScreenShareManager | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const isConnectedRef = useRef<boolean>(false);

  const updateStatus = useCallback(
    (nextStatus: LiveConnectionStatus, connected: boolean) => {
      setStatus(nextStatus);
      isConnectedRef.current = connected;
      onConnectionStateChange?.(connected, nextStatus);
    },
    [onConnectionStateChange]
  );

  const appendOrMergeTranscript = useCallback(
    (role: 'user' | 'agent' | 'tool', text: string, toolName?: string) => {
      const cleaned = text.trim();
      if (!cleaned) return;
      const nowLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setTranscripts((prev) => {
        if (role !== 'tool' && prev.length > 0) {
          const last = prev[prev.length - 1];
          if (last.role === role) {
            const updated = [...prev];
            const separator =
              last.text.endsWith(' ') || cleaned.startsWith(' ') || /^[.,!?]/.test(cleaned)
                ? ''
                : ' ';
            updated[updated.length - 1] = {
              ...last,
              text: `${last.text}${separator}${cleaned}`,
              timestamp: nowLabel,
            };
            return updated;
          }
        }
        return [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            role,
            text: cleaned,
            timestamp: nowLabel,
            toolName,
          },
        ];
      });
    },
    []
  );

  useEffect(() => {
    if (isTranscriptOpen) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, isTranscriptOpen]);

  /**
   * Executes backend quantitative tools (`fetch_market_data`, `analyze_market_structure`, `check_macro_news`)
   * when Gemini emits a `toolCall` over the Live API WebSocket, and sends the `toolResponse` back in real time.
   */
  const handleServerToolCall = useCallback(
    async (message: LiveServerMessage) => {
      const functionCalls = message.toolCall?.functionCalls;
      if (!functionCalls || functionCalls.length === 0) return;

      for (const call of functionCalls) {
        const callId = call.id;
        const callName = call.name || 'unknown_tool';
        const callArgs = (call.args && typeof call.args === 'object' ? call.args : {}) as Record<
          string,
          unknown
        >;

        const assetLabel = typeof callArgs.asset === 'string' ? callArgs.asset : 'XAUUSD';
        const tfLabel = typeof callArgs.timeframe === 'string' ? ` (${callArgs.timeframe})` : '';

        setActiveTools((prev) => [...prev, `${callName}:${assetLabel}`]);
        appendOrMergeTranscript(
          'tool',
          `Executing ${callName} for ${assetLabel}${tfLabel}…`,
          callName
        );

        try {
          const res = await fetch('/api/live-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: callId,
              name: callName,
              args: callArgs,
            }),
          });
          const data = await res.json();
          const toolOutput = data?.result || { error: data?.message || 'Tool execution failed' };

          if (sessionRef.current && isConnectedRef.current) {
            sessionRef.current.sendToolResponse({
              functionResponses: [
                {
                  id: callId,
                  name: callName,
                  response: { output: toolOutput },
                },
              ],
            });
          }

          appendOrMergeTranscript(
            'tool',
            `Completed ${callName} for ${assetLabel}${tfLabel}`,
            callName
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Failed to run tool';
          if (sessionRef.current && isConnectedRef.current) {
            sessionRef.current.sendToolResponse({
              functionResponses: [
                {
                  id: callId,
                  name: callName,
                  response: { error: errMsg },
                },
              ],
            });
          }
        } finally {
          setActiveTools((prev) => prev.filter((item) => item !== `${callName}:${assetLabel}`));
        }
      }
    },
    [appendOrMergeTranscript]
  );

  /**
   * Handles incoming WebSocket messages from the Gemini Live API session
   */
  const handleServerMessage = useCallback(
    (message: LiveServerMessage) => {
      const content = message.serverContent;
      if (content) {
        // 1. Interruption / Barge-in signal
        if (content.interrupted) {
          audioManagerRef.current?.clearPlaybackQueue();
          if (isConnectedRef.current) {
            updateStatus('Live — Listening', true);
          }
        }

        // 2. Process all parts in modelTurn (24kHz PCM audio chunks + optional text parts)
        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            if (part.inlineData?.data) {
              audioManagerRef.current?.enqueuePlaybackPcm24k(part.inlineData.data);
            }
            if (part.text && !content.outputTranscription) {
              appendOrMergeTranscript('agent', part.text);
            }
          }
        }

        // 3. Input and Output Audio Transcriptions
        if (content.inputTranscription?.text) {
          appendOrMergeTranscript('user', content.inputTranscription.text);
        }
        if (content.outputTranscription?.text) {
          appendOrMergeTranscript('agent', content.outputTranscription.text);
        }
      }

      // 4. Real-Time Quantitative Function Calling
      if (message.toolCall?.functionCalls && message.toolCall.functionCalls.length > 0) {
        void handleServerToolCall(message);
      }
    },
    [appendOrMergeTranscript, handleServerToolCall, updateStatus]
  );

  /**
   * Cleans up audio, screen share, and WebSocket connection
   */
  const endLiveSession = useCallback(() => {
    isConnectedRef.current = false;

    if (screenManagerRef.current) {
      screenManagerRef.current.stop();
      screenManagerRef.current = null;
    }
    setIsScreenSharing(false);
    setFramesStreamed(0);

    if (audioManagerRef.current) {
      audioManagerRef.current.stop();
      audioManagerRef.current = null;
    }
    setIsMuted(false);
    setMicLevel(0);

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        // ignore close errors
      }
      sessionRef.current = null;
    }

    setActiveTools([]);
    updateStatus('Idle', false);
  }, [updateStatus]);

  /**
   * Connects to Gemini Live API (`gemini-3.8-live` with automatic fallback to `gemini-3.1-flash-live-preview`)
   * using a short-lived ephemeral token from `/api/live-token` and starts 16kHz mic capture.
   */
  const startLiveSession = useCallback(async () => {
    if (status === 'Connecting' || isConnectedRef.current) return;

    setErrorMessage('');
    updateStatus('Connecting', false);

    try {
      // 1. Fetch ephemeral token & session config from backend
      const tokenRes = await fetch('/api/live-token', {
        method: 'GET',
        cache: 'no-store',
      });
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData?.token) {
        throw new Error(
          tokenData?.message || 'Unable to initialize ephemeral Gemini Live session token.'
        );
      }

      const ephemeralToken: string = tokenData.token;
      const primaryModel: string = tokenData.model || 'gemini-3.8-live';
      const fallbackModel: string = tokenData.fallbackModel || 'gemini-3.1-flash-live-preview';
      const sessionConfig = tokenData.sessionConfig || {};

      // 2. Initialize GoogleGenAI client with the ephemeral token (v1alpha required for ephemeral tokens)
      const ai = new GoogleGenAI({
        apiKey: ephemeralToken,
        httpOptions: { apiVersion: tokenData.apiVersion || 'v1alpha' },
      });

      const connectWithModel = async (modelName: string): Promise<Session> => {
        return await ai.live.connect({
          model: modelName,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: {
              parts: [{ text: sessionConfig.systemInstruction }],
            },
            tools: sessionConfig.tools,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => {
              isConnectedRef.current = true;
              updateStatus('Live — Listening', true);
            },
            onmessage: (msg: LiveServerMessage) => {
              handleServerMessage(msg);
            },
            onerror: (err: ErrorEvent) => {
              console.warn('Gemini Live WebSocket error:', err);
            },
            onclose: () => {
              if (isConnectedRef.current) {
                endLiveSession();
              }
            },
          },
        });
      };

      let liveSession: Session;
      try {
        liveSession = await connectWithModel(primaryModel);
        setActiveModel(primaryModel);
      } catch (primaryErr) {
        console.warn(
          `Primary Live model (${primaryModel}) failed, falling back to ${fallbackModel}:`,
          primaryErr
        );
        liveSession = await connectWithModel(fallbackModel);
        setActiveModel(fallbackModel);
      }

      sessionRef.current = liveSession;
      isConnectedRef.current = true;
      updateStatus('Live — Listening', true);

      // 3. Start Two-Way Audio Engine (16kHz PCM mic capture + 24kHz PCM speaker queue)
      const audioManager = new LiveAudioManager({
        onAudioChunk: (base64Pcm16k) => {
          if (!sessionRef.current || !isConnectedRef.current) return;
          try {
            sessionRef.current.sendRealtimeInput({
              audio: {
                data: base64Pcm16k,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } catch (sendErr) {
            console.warn('Error streaming audio chunk:', sendErr);
          }
        },
        onUserSpeechStart: () => {
          // User started speaking — barge-in clears playback queue automatically in audioManager
          if (isConnectedRef.current) {
            updateStatus('Live — Listening', true);
          }
        },
        onUserSpeechEnd: () => {
          if (!sessionRef.current || !isConnectedRef.current) return;
          try {
            sessionRef.current.sendRealtimeInput({
              audioStreamEnd: true,
            });
          } catch {
            // ignore
          }
        },
        onAgentPlaybackChange: (isPlaying) => {
          if (!isConnectedRef.current) return;
          updateStatus(isPlaying ? 'Agent Speaking' : 'Live — Listening', true);
        },
        onMicLevelChange: (rms) => {
          setMicLevel(Math.min(1, rms * 8));
        },
        onError: (err) => {
          setErrorMessage(err.message);
        },
      });

      audioManagerRef.current = audioManager;
      await audioManager.start();

      appendOrMergeTranscript(
        'agent',
        'Live co-pilot connected. Share your chart screen or ask me to check live structure, bias, or red-folder news.'
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to connect to Gemini Live Co-Pilot.';
      setErrorMessage(msg);
      endLiveSession();
      updateStatus('Error', false);
    }
  }, [appendOrMergeTranscript, endLiveSession, handleServerMessage, status, updateStatus]);

  /**
   * Toggle Microphone Mute / Unmute
   */
  const handleToggleMute = () => {
    if (!audioManagerRef.current) return;
    const nextMuted = !isMuted;
    audioManagerRef.current.setMuted(nextMuted);
    setIsMuted(nextMuted);
    if (nextMuted && sessionRef.current && isConnectedRef.current) {
      try {
        sessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        // ignore
      }
    }
  };

  /**
   * Toggle 1 FPS Live Screen Sharing for TradingView / MetaTrader 5 / Browser Chart analysis
   */
  const handleToggleScreenShare = async () => {
    if (isScreenSharing && screenManagerRef.current) {
      screenManagerRef.current.stop();
      setIsScreenSharing(false);
      return;
    }

    setErrorMessage('');
    try {
      if (!screenManagerRef.current) {
        screenManagerRef.current = new LiveScreenShareManager({
          onFrame: (base64Jpeg) => {
            setFramesStreamed((c) => c + 1);
            if (!sessionRef.current || !isConnectedRef.current) return;
            try {
              sessionRef.current.sendRealtimeInput({
                video: {
                  data: base64Jpeg,
                  mimeType: 'image/jpeg',
                },
              });
            } catch (err) {
              console.warn('Error sending 1 FPS screen frame:', err);
            }
          },
          onShareStarted: (_stream, label) => {
            setIsScreenSharing(true);
            setScreenLabel(label || 'Chart Window');
          },
          onShareStopped: () => {
            setIsScreenSharing(false);
          },
          onError: (err) => {
            setErrorMessage(err.message);
            setIsScreenSharing(false);
          },
        });
      }

      await screenManagerRef.current.start(previewVideoRef.current);
    } catch {
      // Error already surfaced via callback
    }
  };

  useEffect(() => {
    if (isScreenSharing && screenManagerRef.current && previewVideoRef.current) {
      screenManagerRef.current.attachPreviewVideo(previewVideoRef.current);
    }
  }, [isScreenSharing]);

  /**
   * Sends a quick text question or voice prompt over the active Live session
   */
  const handleSendQuickPrompt = (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || !sessionRef.current || !isConnectedRef.current) return;

    audioManagerRef.current?.clearPlaybackQueue();
    appendOrMergeTranscript('user', trimmed);
    try {
      sessionRef.current.sendRealtimeInput({ text: trimmed });
      setQuickPromptText('');
    } catch (err) {
      console.warn('Failed to send realtime text prompt:', err);
    }
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (isConnectedRef.current) {
        endLiveSession();
      }
    };
  }, [endLiveSession]);

  if (!isOpen) return null;

  const isLiveActive = status === 'Live — Listening' || status === 'Agent Speaking';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-[#0F172A]/45 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-label="Apex Vision AI Go Live Trading Co-Pilot"
    >
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-[#E2E8F0] bg-[#F8FAFC] shadow-2xl">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#0F172A] bg-[#1D4ED8] text-white shadow-saas-sm">
              <Radio className={`h-5 w-5 ${isLiveActive ? 'animate-pulse' : ''}`} />
              {isLiveActive && (
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full border border-white bg-[#10B981]" />
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-[#0F172A]">
                  Go Live · SMC Trading Co-Pilot
                </h2>
                <span className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 font-mono text-[10px] font-bold text-[#1D4ED8]">
                  {activeModel}
                </span>
              </div>
              <p className="text-xs text-[#475569]">
                Real-time bidirectional voice &amp; 1 FPS live chart screen analysis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Minimize Go Live drawer"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] transition hover:border-[#0F172A] hover:text-[#0F172A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Live Connection Status Banner */}
          <div className="saas-card rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {status === 'Connecting' ? (
                  <span className="flex h-3 w-3 items-center justify-center">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1D4ED8]" />
                  </span>
                ) : status === 'Agent Speaking' ? (
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1D4ED8] opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#1D4ED8]" />
                  </span>
                ) : status === 'Live — Listening' ? (
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#10B981]" />
                  </span>
                ) : status === 'Error' ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-[#94A3B8]" />
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A]">
                      {status === 'Idle' ? 'Ready to Connect' : status}
                    </span>
                    {isLiveActive && (
                      <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#1D4ED8]">
                        16kHz In / 24kHz Out
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#475569]">
                    {status === 'Connecting'
                      ? 'Minting ephemeral token & opening Gemini Live WebSocket…'
                      : status === 'Agent Speaking'
                      ? 'Co-pilot is speaking — speak anytime to barge in and interrupt'
                      : status === 'Live — Listening'
                      ? isMuted
                        ? 'Microphone muted — unmute to talk to co-pilot'
                        : 'Listening to your microphone & watching shared chart'
                      : 'Start a live voice & screen-sharing session with your SMC co-pilot'}
                  </p>
                </div>
              </div>

              {/* Audio Visualizer / Mic Level Meter */}
              {isLiveActive && (
                <div className="flex items-center gap-1.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5">
                  {status === 'Agent Speaking' ? (
                    <Volume2 className="h-3.5 w-3.5 animate-bounce text-[#1D4ED8]" />
                  ) : isMuted ? (
                    <MicOff className="h-3.5 w-3.5 text-[#EF4444]" />
                  ) : (
                    <Mic className="h-3.5 w-3.5 text-[#1D4ED8]" />
                  )}
                  <div className="flex h-3.5 items-end gap-0.5">
                    {[0.3, 0.6, 1.0, 0.75, 0.45].map((mult, idx) => {
                      const activeLevel =
                        status === 'Agent Speaking'
                          ? 0.65
                          : isMuted
                          ? 0.1
                          : Math.max(0.15, Math.min(1, micLevel * mult));
                      return (
                        <span
                          key={idx}
                          className="w-1 rounded-full bg-[#1D4ED8] transition-all duration-75"
                          style={{ height: `${Math.round(activeLevel * 14)}px` }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Active Tool Execution Pill */}
            {activeTools.length > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#93C5FD] bg-[#EFF6FF] px-3 py-2 text-xs font-mono text-[#1D4ED8]">
                <Wrench className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span className="font-bold">Running Live Quant Tool:</span>
                <span className="truncate">{activeTools.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-xs text-[#0F172A]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
              <div className="flex-1">
                <p className="font-bold text-[#EF4444]">Live Session Notice</p>
                <p className="mt-0.5 text-[#0F172A]">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="font-bold text-[#EF4444] underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Primary Controls: Start Session OR Mic (Mute/Unmute), Share Screen (Start/Stop), End Session */}
          <div className="saas-card rounded-2xl p-4 space-y-3">
            {!isLiveActive && status !== 'Connecting' ? (
              <button
                type="button"
                onClick={startLiveSession}
                className="btn-royal-primary flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-sm font-bold shadow-saas-btn"
              >
                <Radio className="h-4 w-4" />
                <span>Start Live Voice &amp; Screen Session</span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {/* Mic Mute / Unmute Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  disabled={!isLiveActive}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-bold transition ${
                    isMuted
                      ? 'border-[#FECACA] bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2]'
                      : 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]'
                  } disabled:opacity-50`}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                </button>

                {/* Share Screen Start / Stop Toggle */}
                <button
                  type="button"
                  onClick={handleToggleScreenShare}
                  disabled={!isLiveActive}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-bold transition ${
                    isScreenSharing
                      ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white hover:bg-[#1E40AF]'
                      : 'border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#1D4ED8] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]'
                  } disabled:opacity-50`}
                >
                  {isScreenSharing ? (
                    <MonitorOff className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                  <span>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
                </button>

                {/* End Session */}
                <button
                  type="button"
                  onClick={endLiveSession}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[#EF4444] bg-[#EF4444] px-3 py-3 text-xs font-bold text-white transition hover:bg-[#DC2626]"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span>End Session</span>
                </button>
              </div>
            )}

            {/* Quick Voice / Tool Test Prompts when connected */}
            {isLiveActive && (
              <div className="pt-1 space-y-2">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#475569]">
                  Quick Co-Pilot Commands (Or Speak Naturally)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Verify the 4H bias on Gold',
                    'Check if there is red-folder USD news right now',
                    'Fetch live multi-timeframe market data on XAUUSD',
                    'Analyze the chart structure on my shared screen',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendQuickPrompt(prompt)}
                      className="rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-medium text-[#0F172A] transition hover:border-[#1D4ED8] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live Screen Sharing Preview Box (1 FPS JPEG Stream) */}
          <div className="saas-card overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-[#1D4ED8]" />
                <span className="text-xs font-bold text-[#0F172A]">
                  Live Chart Screen Feed
                </span>
                {isScreenSharing && (
                  <span className="rounded-full border border-[#93C5FD] bg-[#EFF6FF] px-2 py-0.5 font-mono text-[10px] font-bold text-[#1D4ED8]">
                    1 FPS · JPEG 0.7 · {framesStreamed} frames
                  </span>
                )}
              </div>

              {isScreenSharing && (
                <span className="truncate max-w-[160px] font-mono text-[10px] font-semibold text-[#475569]">
                  {screenLabel}
                </span>
              )}
            </div>

            <div className="relative flex min-h-[190px] items-center justify-center bg-[#0F172A] p-2">
              <video
                ref={previewVideoRef}
                muted
                playsInline
                autoPlay
                className={`max-h-[220px] w-full rounded-lg object-contain ${
                  isScreenSharing ? 'block' : 'hidden'
                }`}
              />

              {!isScreenSharing && (
                <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
                  <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#1E293B] bg-[#1E293B]/80 text-[#93C5FD]">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-white">
                    No chart window shared yet
                  </p>
                  <p className="mt-1 max-w-xs text-[11px] text-[#94A3B8]">
                    Click &ldquo;Share Screen&rdquo; during a live call to stream your TradingView or MetaTrader 5 chart at 1 FPS.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Live Transcript Feed */}
          <div className="saas-card overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => setIsTranscriptOpen((prev) => !prev)}
              className="flex w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-3 text-left transition hover:bg-[#F8FAFC]"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#1D4ED8]" />
                <span className="text-xs font-bold text-[#0F172A]">
                  Live Transcript &amp; Tool Telemetry
                </span>
                <span className="rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[10px] font-bold text-[#475569]">
                  {transcripts.length}
                </span>
              </div>
              {isTranscriptOpen ? (
                <ChevronUp className="h-4 w-4 text-[#475569]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#475569]" />
              )}
            </button>

            {isTranscriptOpen && (
              <div className="space-y-3 p-4">
                <div className="max-h-64 min-h-[150px] space-y-2.5 overflow-y-auto pr-1">
                  {transcripts.length === 0 ? (
                    <div className="flex h-36 flex-col items-center justify-center text-center text-xs text-[#64748B]">
                      <Sparkles className="mb-1.5 h-4 w-4 text-[#1D4ED8]" />
                      <p className="font-semibold text-[#0F172A]">
                        Real-time conversation transcript appears here
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#475569]">
                        Start the session and speak or share your TradingView/MT5 chart.
                      </p>
                    </div>
                  ) : (
                    transcripts.map((entry) => (
                      <div
                        key={entry.id}
                        className={`rounded-xl border p-2.5 text-xs ${
                          entry.role === 'user'
                            ? 'ml-6 border-[#BFDBFE] bg-[#EFF6FF] text-[#0F172A]'
                            : entry.role === 'tool'
                            ? 'border-[#FDE68A] bg-[#FEF3C7]/60 font-mono text-[11px] text-[#0F172A]'
                            : 'mr-6 border-[#E2E8F0] bg-white text-[#0F172A]'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className={`font-mono text-[10px] font-bold uppercase ${
                              entry.role === 'user'
                                ? 'text-[#1D4ED8]'
                                : entry.role === 'tool'
                                ? 'text-[#D97706]'
                                : 'text-[#0F172A]'
                            }`}
                          >
                            {entry.role === 'user'
                              ? 'You (Trader)'
                              : entry.role === 'tool'
                              ? `Quant Engine · ${entry.toolName || 'Tool'}`
                              : 'Apex Live Co-Pilot'}
                          </span>
                          <span className="font-mono text-[9px] text-[#64748B]">
                            {entry.timestamp}
                          </span>
                        </div>
                        <p className="leading-relaxed">{entry.text}</p>
                      </div>
                    ))
                  )}
                  <div ref={transcriptEndRef} />
                </div>

                {/* Optional Text Input for Hybrid Voice + Text during Live Call */}
                {isLiveActive && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendQuickPrompt(quickPromptText);
                    }}
                    className="flex items-center gap-2 pt-2 border-t border-[#E2E8F0]"
                  >
                    <input
                      type="text"
                      value={quickPromptText}
                      onChange={(e) => setQuickPromptText(e.target.value)}
                      placeholder="Ask a question or type a command to the live co-pilot…"
                      className="flex-1 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0F172A] placeholder:text-[#64748B] focus:border-[#1D4ED8] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!quickPromptText.trim()}
                      className="inline-flex items-center justify-center rounded-lg bg-[#1D4ED8] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1E40AF] disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Wired Quantitative Tools Status Card */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#0F172A]">
              <Cpu className="h-3.5 w-3.5 text-[#1D4ED8]" />
              <span>Active Live Function Declarations</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { name: 'fetch_market_data', desc: '4H/1H/15M/5M OHLCV' },
                { name: 'analyze_market_structure', desc: 'SMC BOS/FVG/OB/ATR' },
                { name: 'check_macro_news', desc: '±60m Red-Folder Guard' },
              ].map((tool) => (
                <div
                  key={tool.name}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF]/70 px-2.5 py-1 text-[10px] font-mono"
                >
                  <Activity className="h-3 w-3 text-[#1D4ED8]" />
                  <span className="font-bold text-[#1D4ED8]">{tool.name}</span>
                  <span className="text-[#475569]">· {tool.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
