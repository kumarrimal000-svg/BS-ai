/**
 * AudioStreamer handles gapless playback of 24kHz raw PCM chunks from Gemini Live.
 * It features precise scheduling, an AnalyserNode for futuristic visualizers,
 * smooth volume and speed controls, voice response toggles, and instant interruption handling.
 */
export class AudioStreamer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private sampleRate: number = 24000;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;
  private isPlaying: boolean = false;
  private endTimeoutId: any = null;

  // Voice Settings controls
  private volume: number = 1.0; // 0.0 to 1.0
  private playbackSpeed: number = 1.0; // 0.8 to 1.3
  private voiceResponseEnabled: boolean = true;
  private isMuted: boolean = false;

  constructor(
    sampleRate: number = 24000,
    onPlaybackStateChange?: (isPlaying: boolean) => void
  ) {
    this.sampleRate = sampleRate;
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  public async initialize(): Promise<void> {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: this.sampleRate });

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.gainNode = this.audioCtx.createGain();
      this.applyGain();

      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {
        console.warn('[AudioStreamer] AudioContext resume warning:', e);
      }
    }
  }

  private applyGain(): void {
    if (!this.gainNode || !this.audioCtx) return;
    const targetGain = !this.voiceResponseEnabled || this.isMuted ? 0 : Math.max(0, Math.min(1.5, this.volume));
    try {
      this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);
    } catch {
      this.gainNode.gain.value = targetGain;
    }
  }

  public setVolume(volumePercent: number): void {
    this.volume = Math.max(0, Math.min(100, volumePercent)) / 100;
    this.applyGain();
  }

  public setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.75, Math.min(1.5, speed));
  }

  public setVoiceResponseEnabled(enabled: boolean): void {
    this.voiceResponseEnabled = enabled;
    this.applyGain();
    if (!enabled && this.isPlaying) {
      this.stop();
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.applyGain();
  }

  /**
   * Schedules a raw 16-bit PCM base64 chunk for gapless playback with speed and volume adjustments
   */
  public async addPCMChunk(base64Data: string): Promise<void> {
    if (!this.voiceResponseEnabled) {
      // Voice output is disabled by user in Voice Settings
      return;
    }

    await this.initialize();
    if (!this.audioCtx || !this.gainNode) return;

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 16-bit signed PCM, little-endian
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        // Normalize -32768..32767 to -1.0..1.0
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.audioCtx.createBuffer(1, float32Array.length, this.sampleRate);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = this.playbackSpeed;
      source.connect(this.gainNode);

      const currentTime = this.audioCtx.currentTime;
      // If nextStartTime is in the past, start immediately
      const startTime = Math.max(this.nextStartTime, currentTime);
      source.start(startTime);

      // Duration scaled by playback speed
      const effectiveDuration = audioBuffer.duration / this.playbackSpeed;
      this.nextStartTime = startTime + effectiveDuration;
      this.activeSources.add(source);

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.onPlaybackStateChange?.(true);
      }

      // Clear any pending transition back to idle
      if (this.endTimeoutId) {
        clearTimeout(this.endTimeoutId);
      }

      // Schedule check when this chunk finishes
      const remainingMs = Math.max(10, (this.nextStartTime - this.audioCtx.currentTime) * 1000 + 80);
      this.endTimeoutId = setTimeout(() => {
        this.checkPlaybackEnd();
      }, remainingMs);

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
          this.checkPlaybackEnd();
        }
      };
    } catch (err: any) {
      console.warn('[AudioStreamer] Error decoding audio chunk handled:', err?.message || err);
    }
  }

  private checkPlaybackEnd(): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.currentTime >= this.nextStartTime - 0.05 && this.activeSources.size === 0) {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.onPlaybackStateChange?.(false);
      }
    }
  }

  /**
   * Immediately stops all playing and scheduled audio (e.g. for user interruption)
   * Prevents overlapping responses and cuts off speech with zero delay.
   */
  public stop(): void {
    if (this.endTimeoutId) {
      clearTimeout(this.endTimeoutId);
      this.endTimeoutId = null;
    }

    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source might already have stopped
      }
    }
    this.activeSources.clear();

    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }

    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlaybackStateChange?.(false);
    }
  }

  /**
   * Returns normalized audio volume [0.0, 1.0] for the visualizer
   */
  public getVolume(): number {
    if (!this.analyser || !this.dataArray || !this.isPlaying || !this.voiceResponseEnabled) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    const len = this.dataArray.length;
    for (let i = 0; i < len; i++) {
      sum += this.dataArray[i];
    }
    const avg = sum / len;
    return Math.min(1.0, (avg / 128.0) * (this.volume || 1));
  }

  /**
   * Returns frequency spectrum array for waveform rendering
   */
  public getFrequencyData(): Uint8Array<ArrayBuffer> {
    if (!this.analyser || !this.dataArray || !this.isPlaying || !this.voiceResponseEnabled) {
      return new Uint8Array(32);
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public close(): void {
    this.stop();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // Audio context may already be closing
      }
    }
    this.audioCtx = null;
  }
}
