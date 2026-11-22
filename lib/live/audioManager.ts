'use client';

/**
 * Two-Way Audio Call Engine for Gemini Live API (`lib/live/audioManager.ts`)
 * - Microphone Capture: Downsamples mic input to 16-bit PCM, 16kHz, mono, little-endian,
 *   base64-encodes chunks, and streams them via `sendRealtimeInput({ audio: ... })`.
 * - Speaker Playback & Barge-in: Decodes incoming 24kHz 16-bit PCM little-endian audio chunks
 *   from the model and schedules them smoothly through an AudioContext playback queue.
 *   Clears the playback queue immediately on user speech barge-in or server `interrupted` event.
 */

export const INPUT_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

export interface AudioManagerCallbacks {
  onAudioChunk: (base64Pcm16k: string) => void;
  onUserSpeechStart?: () => void;
  onUserSpeechEnd?: () => void;
  onAgentPlaybackChange?: (isPlaying: boolean) => void;
  onMicLevelChange?: (rmsLevel: number) => void;
  onError?: (error: Error) => void;
}

const WORKLET_PROCESSOR_CODE = `
class Pcm16kCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.targetChunkSize = 1600; // 100ms at 16kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const channelData = input[0];
    const ratio = sampleRate / 16000;

    // Calculate RMS for VAD / UI meter
    let sumSq = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSq += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sumSq / channelData.length);

    if (Math.abs(ratio - 1) < 0.01) {
      for (let i = 0; i < channelData.length; i++) {
        this.buffer.push(channelData[i]);
      }
    } else {
      const outLength = Math.floor(channelData.length / ratio);
      for (let i = 0; i < outLength; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.min(channelData.length, Math.floor((i + 1) * ratio));
        let acc = 0;
        let count = 0;
        for (let j = start; j < end; j++) {
          acc += channelData[j];
          count++;
        }
        this.buffer.push(count > 0 ? acc / count : channelData[start]);
      }
    }

    while (this.buffer.length >= this.targetChunkSize) {
      const slice = this.buffer.splice(0, this.targetChunkSize);
      const pcmBuffer = new ArrayBuffer(slice.length * 2);
      const view = new DataView(pcmBuffer);
      for (let i = 0; i < slice.length; i++) {
        const clamped = Math.max(-1, Math.min(1, slice[i]));
        const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        view.setInt16(i * 2, int16, true); // little-endian
      }
      this.port.postMessage({ pcmBuffer, rms }, [pcmBuffer]);
    }

    return true;
  }
}

registerProcessor('pcm-16k-capture-processor', Pcm16kCaptureProcessor);
`;

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.replace(/\s+/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Downsamples arbitrary Float32 audio buffer to 16kHz 16-bit signed little-endian PCM ArrayBuffer
 */
export function downsampleFloat32ToInt16Le(
  input: Float32Array,
  sourceSampleRate: number,
  targetSampleRate = INPUT_SAMPLE_RATE
): ArrayBuffer {
  if (input.length === 0) return new ArrayBuffer(0);
  const ratio = sourceSampleRate / targetSampleRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const pcmBuffer = new ArrayBuffer(outputLength * 2);
  const view = new DataView(pcmBuffer);

  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += input[j];
      count++;
    }
    const sample = count > 0 ? sum / count : input[start] || 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(i * 2, int16, true); // little-endian
  }

  return pcmBuffer;
}

export class LiveAudioManager {
  private callbacks: AudioManagerCallbacks;
  private micStream: MediaStream | null = null;
  private captureContext: AudioContext | null = null;
  private playbackContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private silentGainNode: GainNode | null = null;

  private activePlaybackSources: Set<AudioBufferSourceNode> = new Set();
  private nextPlaybackTime = 0;
  private isMuted = false;
  private isRunning = false;
  private isAgentPlaying = false;

  // Client-side barge-in VAD tracking
  private consecutiveSpeechFrames = 0;
  private silenceFrames = 0;
  private userSpeaking = false;
  private readonly bargeInRmsThreshold = 0.045;
  private readonly bargeInRequiredFrames = 3;

  constructor(callbacks: AudioManagerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Starts microphone capture and initializes playback AudioContext
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: INPUT_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      this.captureContext = new AudioCtx({ sampleRate: INPUT_SAMPLE_RATE });
      this.playbackContext = new AudioCtx({ sampleRate: OUTPUT_SAMPLE_RATE });

      if (this.captureContext.state === 'suspended') {
        await this.captureContext.resume();
      }
      if (this.playbackContext.state === 'suspended') {
        await this.playbackContext.resume();
      }

      this.sourceNode = this.captureContext.createMediaStreamSource(this.micStream);
      this.silentGainNode = this.captureContext.createGain();
      this.silentGainNode.gain.value = 0;
      this.silentGainNode.connect(this.captureContext.destination);

      let workletAttached = false;
      if (this.captureContext.audioWorklet && typeof Blob !== 'undefined') {
        try {
          const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          await this.captureContext.audioWorklet.addModule(workletUrl);
          URL.revokeObjectURL(workletUrl);

          this.workletNode = new AudioWorkletNode(
            this.captureContext,
            'pcm-16k-capture-processor'
          );
          this.workletNode.port.onmessage = (event: MessageEvent<{ pcmBuffer: ArrayBuffer; rms: number }>) => {
            if (!this.isRunning || this.isMuted) return;
            const { pcmBuffer, rms } = event.data;
            this.handleCapturedPcmBuffer(pcmBuffer, rms);
          };

          this.sourceNode.connect(this.workletNode);
          this.workletNode.connect(this.silentGainNode);
          workletAttached = true;
        } catch (workletErr) {
          console.warn('AudioWorklet fallback to ScriptProcessorNode:', workletErr);
        }
      }

      if (!workletAttached) {
        const bufferSize = 2048;
        this.scriptProcessorNode = this.captureContext.createScriptProcessor(bufferSize, 1, 1);
        const actualRate = this.captureContext.sampleRate;

        this.scriptProcessorNode.onaudioprocess = (event: AudioProcessingEvent) => {
          if (!this.isRunning || this.isMuted) return;
          const channelData = event.inputBuffer.getChannelData(0);
          let sumSq = 0;
          for (let i = 0; i < channelData.length; i++) {
            sumSq += channelData[i] * channelData[i];
          }
          const rms = Math.sqrt(sumSq / channelData.length);
          const pcmBuffer = downsampleFloat32ToInt16Le(channelData, actualRate, INPUT_SAMPLE_RATE);
          this.handleCapturedPcmBuffer(pcmBuffer, rms);
        };

        this.sourceNode.connect(this.scriptProcessorNode);
        this.scriptProcessorNode.connect(this.silentGainNode);
      }

      this.isRunning = true;
      this.isMuted = false;
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Microphone permission denied or audio device unavailable.');
      this.callbacks.onError?.(error);
      throw error;
    }
  }

  private handleCapturedPcmBuffer(pcmBuffer: ArrayBuffer, rms: number): void {
    this.callbacks.onMicLevelChange?.(rms);

    // Client-side Voice Activity Detection (VAD) for responsive barge-in interruption
    if (rms >= this.bargeInRmsThreshold) {
      this.consecutiveSpeechFrames++;
      this.silenceFrames = 0;
      if (this.consecutiveSpeechFrames >= this.bargeInRequiredFrames) {
        if (!this.userSpeaking) {
          this.userSpeaking = true;
          this.callbacks.onUserSpeechStart?.();
        }
        // If the agent is currently speaking and user speaks over them, trigger immediate barge-in
        if (this.isAgentPlaying) {
          this.clearPlaybackQueue();
        }
      }
    } else {
      this.consecutiveSpeechFrames = 0;
      if (this.userSpeaking) {
        this.silenceFrames++;
        if (this.silenceFrames >= 8) {
          this.userSpeaking = false;
          this.callbacks.onUserSpeechEnd?.();
        }
      }
    }

    const base64Pcm = arrayBufferToBase64(pcmBuffer);
    this.callbacks.onAudioChunk(base64Pcm);
  }

  /**
   * Decodes incoming 24kHz 16-bit PCM little-endian base64 audio from Gemini Live API
   * and schedules seamless gapless playback in the AudioContext queue.
   */
  enqueuePlaybackPcm24k(base64Audio: string): void {
    if (!this.playbackContext || !base64Audio) return;

    try {
      if (this.playbackContext.state === 'suspended') {
        void this.playbackContext.resume();
      }

      const bytes = base64ToUint8Array(base64Audio);
      const sampleCount = Math.floor(bytes.byteLength / 2);
      if (sampleCount <= 0) return;

      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const float32Samples = new Float32Array(sampleCount);

      for (let i = 0; i < sampleCount; i++) {
        const int16 = view.getInt16(i * 2, true); // little-endian
        float32Samples[i] = int16 / 32768.0;
      }

      const audioBuffer = this.playbackContext.createBuffer(
        1,
        sampleCount,
        OUTPUT_SAMPLE_RATE
      );
      audioBuffer.getChannelData(0).set(float32Samples);

      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);

      const now = this.playbackContext.currentTime;
      if (this.nextPlaybackTime < now) {
        this.nextPlaybackTime = now + 0.015; // slight jitter buffer
      }

      source.start(this.nextPlaybackTime);
      this.nextPlaybackTime += audioBuffer.duration;

      this.activePlaybackSources.add(source);
      this.updateAgentPlayingState(true);

      source.onended = () => {
        this.activePlaybackSources.delete(source);
        if (this.activePlaybackSources.size === 0) {
          this.updateAgentPlayingState(false);
        }
      };
    } catch (err) {
      console.warn('Error decoding 24kHz PCM playback chunk:', err);
    }
  }

  /**
   * Immediately halts all queued speaker audio when the user barges in or server sends `interrupted: true`
   */
  clearPlaybackQueue(): void {
    this.activePlaybackSources.forEach((source) => {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch {
        // ignore if already stopped
      }
    });
    this.activePlaybackSources.clear();
    if (this.playbackContext) {
      this.nextPlaybackTime = this.playbackContext.currentTime;
    } else {
      this.nextPlaybackTime = 0;
    }
    this.updateAgentPlayingState(false);
  }

  private updateAgentPlayingState(playing: boolean): void {
    if (this.isAgentPlaying !== playing) {
      this.isAgentPlaying = playing;
      this.callbacks.onAgentPlaybackChange?.(playing);
    }
  }

  /**
   * Mute / Unmute microphone
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    if (muted) {
      this.callbacks.onMicLevelChange?.(0);
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Stops microphone capture, clears speaker playback queue, and closes AudioContexts
   */
  stop(): void {
    this.isRunning = false;
    this.clearPlaybackQueue();

    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null;
        this.workletNode.disconnect();
      } catch {
        // ignore
      }
      this.workletNode = null;
    }

    if (this.scriptProcessorNode) {
      try {
        this.scriptProcessorNode.onaudioprocess = null;
        this.scriptProcessorNode.disconnect();
      } catch {
        // ignore
      }
      this.scriptProcessorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }

    if (this.silentGainNode) {
      try {
        this.silentGainNode.disconnect();
      } catch {
        // ignore
      }
      this.silentGainNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.captureContext) {
      void this.captureContext.close().catch(() => undefined);
      this.captureContext = null;
    }

    if (this.playbackContext) {
      void this.playbackContext.close().catch(() => undefined);
      this.playbackContext = null;
    }
  }
}
