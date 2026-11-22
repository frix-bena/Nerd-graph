'use client';

/**
 * Live Screen Sharing Engine for Real-Time Chart & Market Analysis (`lib/live/screenShare.ts`)
 * - Uses `navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false })`
 *   to let the user share their TradingView, MetaTrader 5, or browser chart window.
 * - Renders the shared screen in a preview `<video>` element inside the Go Live panel.
 * - Runs a `setInterval` loop at 1 frame per second (1 FPS) that draws the active `<video>`
 *   frame onto an offscreen `<canvas>` (max width 1280px), encodes it as a compressed JPEG
 *   (`image/jpeg`, quality 0.7), and streams base64 frames through the Live API WebSocket.
 * - Handles the browser's native "Stop Sharing" button (`track.onended`) gracefully without
 *   dropping the active audio call.
 */

export const MAX_CAPTURE_WIDTH = 1280;
export const JPEG_QUALITY = 0.7;
export const CAPTURE_INTERVAL_MS = 1000; // 1 FPS

export interface ScreenShareCallbacks {
  onFrame: (base64Jpeg: string, width: number, height: number) => void;
  onShareStarted?: (stream: MediaStream, label: string) => void;
  onShareStopped?: () => void;
  onError?: (error: Error) => void;
}

export class LiveScreenShareManager {
  private callbacks: ScreenShareCallbacks;
  private displayStream: MediaStream | null = null;
  private previewVideoEl: HTMLVideoElement | null = null;
  private internalVideoEl: HTMLVideoElement | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private frameIntervalId: ReturnType<typeof setInterval> | null = null;
  private isSharing = false;
  private framesSentCount = 0;

  constructor(callbacks: ScreenShareCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Attaches or updates the preview `<video>` element in the Go Live modal
   */
  attachPreviewVideo(videoEl: HTMLVideoElement | null): void {
    this.previewVideoEl = videoEl;
    if (videoEl && this.displayStream) {
      videoEl.srcObject = this.displayStream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      void videoEl.play().catch(() => undefined);
    }
  }

  /**
   * Starts screen capture and launches the 1 FPS JPEG compression & streaming loop
   */
  async start(previewVideoEl?: HTMLVideoElement | null): Promise<MediaStream> {
    if (this.isSharing && this.displayStream) {
      return this.displayStream;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 5,
        },
        audio: false,
      });

      this.displayStream = stream;
      this.isSharing = true;
      this.framesSentCount = 0;

      const videoTrack = stream.getVideoTracks()[0];
      const trackLabel = videoTrack?.label || 'Chart Window';

      // Gracefully handle browser's native "Stop Sharing" bar button without dropping the audio call
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stop();
        };
      }

      if (previewVideoEl) {
        this.previewVideoEl = previewVideoEl;
      }

      if (this.previewVideoEl) {
        this.previewVideoEl.srcObject = stream;
        this.previewVideoEl.muted = true;
        this.previewVideoEl.playsInline = true;
        await this.previewVideoEl.play().catch(() => undefined);
      }

      // Maintain an offscreen video element in case the preview box is collapsed or re-mounted
      this.internalVideoEl = document.createElement('video');
      this.internalVideoEl.srcObject = stream;
      this.internalVideoEl.muted = true;
      this.internalVideoEl.playsInline = true;
      await this.internalVideoEl.play().catch(() => undefined);

      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
        alpha: false,
      });

      this.callbacks.onShareStarted?.(stream, trackLabel);

      // Immediately capture an initial frame once metadata is ready, then run at 1 FPS (1000ms)
      setTimeout(() => {
        if (this.isSharing) {
          this.captureAndSendFrame();
        }
      }, 250);

      this.frameIntervalId = setInterval(() => {
        this.captureAndSendFrame();
      }, CAPTURE_INTERVAL_MS);

      return stream;
    } catch (err) {
      this.isSharing = false;
      const error =
        err instanceof Error ? err : new Error('Screen sharing was cancelled or blocked.');
      this.callbacks.onError?.(error);
      throw error;
    }
  }

  private captureAndSendFrame(): void {
    if (!this.isSharing || !this.offscreenCanvas || !this.offscreenCtx) return;

    const videoSource =
      this.previewVideoEl && this.previewVideoEl.readyState >= 2
        ? this.previewVideoEl
        : this.internalVideoEl;

    if (!videoSource || videoSource.readyState < 2) return;

    const rawWidth = videoSource.videoWidth;
    const rawHeight = videoSource.videoHeight;
    if (!rawWidth || !rawHeight) return;

    const scale = rawWidth > MAX_CAPTURE_WIDTH ? MAX_CAPTURE_WIDTH / rawWidth : 1;
    const targetWidth = Math.max(1, Math.round(rawWidth * scale));
    const targetHeight = Math.max(1, Math.round(rawHeight * scale));

    if (
      this.offscreenCanvas.width !== targetWidth ||
      this.offscreenCanvas.height !== targetHeight
    ) {
      this.offscreenCanvas.width = targetWidth;
      this.offscreenCanvas.height = targetHeight;
    }

    this.offscreenCtx.drawImage(videoSource, 0, 0, targetWidth, targetHeight);
    const dataUrl = this.offscreenCanvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) return;

    const base64Jpeg = dataUrl.slice(commaIndex + 1);
    if (!base64Jpeg) return;

    this.framesSentCount++;
    this.callbacks.onFrame(base64Jpeg, targetWidth, targetHeight);
  }

  getIsSharing(): boolean {
    return this.isSharing;
  }

  getFramesSentCount(): number {
    return this.framesSentCount;
  }

  getStream(): MediaStream | null {
    return this.displayStream;
  }

  /**
   * Stops screen capture and cleans up interval & tracks without interrupting the voice session
   */
  stop(): void {
    const wasSharing = this.isSharing;
    this.isSharing = false;

    if (this.frameIntervalId) {
      clearInterval(this.frameIntervalId);
      this.frameIntervalId = null;
    }

    if (this.displayStream) {
      this.displayStream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      this.displayStream = null;
    }

    if (this.previewVideoEl) {
      this.previewVideoEl.srcObject = null;
    }

    if (this.internalVideoEl) {
      this.internalVideoEl.srcObject = null;
      this.internalVideoEl = null;
    }

    this.offscreenCanvas = null;
    this.offscreenCtx = null;

    if (wasSharing) {
      this.callbacks.onShareStopped?.();
    }
  }
}
