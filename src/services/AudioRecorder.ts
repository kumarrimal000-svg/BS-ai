/**
 * AudioRecorder captures user microphone input, applies noise reduction and high-pass filtering,
 * resamples to 16kHz 16-bit linear PCM, and streams base64 chunks for Gemini Live.
 * It also computes volume, frequency data, voice activity detection (VAD), and provides
 * a standalone hardware microphone testing suite.
 */

import { AcousticFeatures } from '../types/emotion';

export interface AudioRecorderOptions {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  highpassFilter?: boolean;
  micSensitivity?: number; // 1 to 100
  onSpeechDetected?: () => void;
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private onAudioData: (base64Chunk: string) => void;
  private isRecording: boolean = false;
  private targetSampleRate: number = 16000;

  // Real acoustic features for subtle emotion estimation
  private recentRmsLevels: number[] = [];
  private acousticPeak: number = 0;

  // Voice Settings & Processing Options
  private options: AudioRecorderOptions = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    highpassFilter: true,
    micSensitivity: 65,
  };

  // Speech Detection / VAD state
  private speechStreakCount: number = 0;
  private lastSpeechTime: number = 0;

  constructor(
    onAudioData: (base64Chunk: string) => void,
    options?: AudioRecorderOptions
  ) {
    this.onAudioData = onAudioData;
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  public updateOptions(options: Partial<AudioRecorderOptions>): void {
    this.options = { ...this.options, ...options };
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      // Request high-quality speech mic input with user-configured constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: this.options.echoCancellation !== false,
          noiseSuppression: this.options.noiseSuppression !== false,
          autoGainControl: this.options.autoGainControl !== false,
        },
      });
    } catch (err: any) {
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        throw new Error('Microphone permission was denied. Please allow microphone access in your browser site settings.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        throw new Error('No microphone device found on your system. Please connect an audio input device.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        throw new Error('Microphone is busy or already being used by another application.');
      } else {
        throw new Error(err?.message || 'Could not initialize microphone.');
      }
    }

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtxClass();

    if (this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {
        console.warn('[AudioRecorder] AudioContext resume warning:', e);
      }
    }

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

    // Highpass Biquad Filter to remove low-frequency room rumble and HVAC hum (< 80 Hz)
    if (this.options.highpassFilter !== false) {
      this.filterNode = this.audioCtx.createBiquadFilter();
      this.filterNode.type = 'highpass';
      this.filterNode.frequency.setValueAtTime(80, this.audioCtx.currentTime);
      this.sourceNode.connect(this.filterNode);
    }

    // Analyser node for real-time visual feedback of user's voice
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.5;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const inputChain = this.filterNode || this.sourceNode;
    inputChain.connect(this.analyser);

    // Buffer size of 4096 gives balanced latency and stable chunking
    const bufferSize = 4096;
    this.processorNode = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputBuffer = e.inputBuffer.getChannelData(0);
      const inputSampleRate = this.audioCtx?.sampleRate || 44100;

      // Voice Activity Detection (VAD) check
      this.checkVoiceActivity(inputBuffer);

      // Resample down to 16kHz linear PCM
      const pcm16Data = this.downsampleAndEncodePCM(inputBuffer, inputSampleRate, this.targetSampleRate);
      if (pcm16Data) {
        const base64Chunk = this.arrayBufferToBase64(pcm16Data.buffer);
        this.onAudioData(base64Chunk);
      }
    };

    inputChain.connect(this.processorNode);

    // Route processor through a muted gain node to keep Web Audio processing active without feedback echo
    const muteGain = this.audioCtx.createGain();
    muteGain.gain.value = 0;
    this.processorNode.connect(muteGain);
    muteGain.connect(this.audioCtx.destination);
    this.isRecording = true;
  }

  /**
   * Voice Activity Detection to detect when user speaks and collect real acoustic volume features
   */
  private checkVoiceActivity(buffer: Float32Array): void {
    let sum = 0;
    let localPeak = 0;
    for (let i = 0; i < buffer.length; i++) {
      const val = Math.abs(buffer[i]);
      if (val > localPeak) localPeak = val;
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);

    if (localPeak > this.acousticPeak) {
      this.acousticPeak = localPeak;
    }
    this.recentRmsLevels.push(rms);
    if (this.recentRmsLevels.length > 40) {
      this.recentRmsLevels.shift();
    }

    if (!this.options.onSpeechDetected) return;

    // Sensitivity threshold: higher sensitivity -> lower threshold required
    const sensitivity = this.options.micSensitivity || 65;
    const threshold = Math.max(0.005, 0.05 - (sensitivity / 100) * 0.04);

    const now = Date.now();
    if (rms > threshold) {
      this.speechStreakCount++;
      if (this.speechStreakCount >= 2 && now - this.lastSpeechTime > 800) {
        this.lastSpeechTime = now;
        this.options.onSpeechDetected();
      }
    } else {
      this.speechStreakCount = Math.max(0, this.speechStreakCount - 1);
    }
  }

  public stop(): void {
    this.isRecording = false;
    this.acousticPeak = 0;
    this.recentRmsLevels = [];

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.filterNode) {
      this.filterNode.disconnect();
      this.filterNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // Audio context may already be closing
      }
      this.audioCtx = null;
    }
  }

  /**
   * Resamples Float32 audio samples from source sample rate to 16kHz and encodes as 16-bit linear PCM
   */
  private downsampleAndEncodePCM(
    inputData: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number
  ): Int16Array | null {
    if (inputData.length === 0) return null;

    if (inputSampleRate === outputSampleRate) {
      const output = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return output;
    }

    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(inputData.length / sampleRateRatio);
    const output = new Int16Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < output.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputData.length; i++) {
        accum += inputData[i];
        count++;
      }
      const avg = count > 0 ? accum / count : 0;
      const s = Math.max(-1, Math.min(1, avg));
      output[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Returns current mic input volume normalized [0.0, 1.0] for the visualizer
   */
  public getVolume(): number {
    if (!this.analyser || !this.dataArray || !this.isRecording) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    const len = this.dataArray.length;
    for (let i = 0; i < len; i++) {
      sum += this.dataArray[i];
    }
    const avg = sum / len;
    return Math.min(1.0, (avg / 128.0) * 1.5);
  }

  /**
   * Returns frequency spectrum array for waveform rendering
   */
  public getFrequencyData(): Uint8Array<ArrayBuffer> {
    if (!this.analyser || !this.dataArray) {
      return new Uint8Array(32);
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Returns current real acoustic characteristics (volume, variance, tempo) for subtle emotion estimation
   */
  public getAcousticFeatures(): AcousticFeatures {
    if (!this.isRecording || this.recentRmsLevels.length === 0) {
      return {
        averageVolume: 0,
        peakVolume: 0,
        volumeVariance: 0,
        tempoRate: 'normal',
        available: false,
      };
    }

    const count = this.recentRmsLevels.length;
    const avg = this.recentRmsLevels.reduce((a, b) => a + b, 0) / count;
    const variance =
      this.recentRmsLevels.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count;

    let tempoRate: 'slow' | 'normal' | 'fast' = 'normal';
    if (variance > 0.04 && avg > 0.22) {
      tempoRate = 'fast';
    } else if (avg < 0.08) {
      tempoRate = 'slow';
    }

    return {
      averageVolume: Math.min(1.0, avg * 2.5),
      peakVolume: Math.min(1.0, this.acousticPeak * 2.5),
      volumeVariance: variance,
      tempoRate,
      available: true,
    };
  }
}

/**
 * Dedicated Hardware Microphone Testing Suite
 * Records a short audio sample, computes peak/average dB, checks background noise,
 * and allows instant playback to confirm mic clarity and hardware health.
 */
export class MicrophoneTester {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private recordedChunks: Float32Array[] = [];
  private recordedBuffer: AudioBuffer | null = null;
  private isTesting: boolean = false;
  private peakDb: number = -100;
  private sumRms: number = 0;
  private rmsCount: number = 0;

  public async startTest(
    durationMs: number = 3000,
    onProgress?: (dbLevel: number, frequencyData: Uint8Array) => void
  ): Promise<{
    peakDb: number;
    avgDb: number;
    hasAudioInput: boolean;
    backgroundNoiseLevel: 'low' | 'moderate' | 'high';
  }> {
    if (this.isTesting) {
      throw new Error('Microphone test is already running.');
    }

    this.isTesting = true;
    this.recordedChunks = [];
    this.peakDb = -100;
    this.sumRms = 0;
    this.rmsCount = 0;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      this.isTesting = false;
      throw new Error(err?.message || 'Failed to open microphone for testing.');
    }

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtxClass();
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const source = this.audioCtx.createMediaStreamSource(this.mediaStream);
    const analyser = this.audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    const processor = this.audioCtx.createScriptProcessor(2048, 1, 1);
    processor.onaudioprocess = (e) => {
      if (!this.isTesting) return;
      const channelData = e.inputBuffer.getChannelData(0);
      const copy = new Float32Array(channelData.length);
      copy.set(channelData);
      this.recordedChunks.push(copy);

      // Compute RMS and dB
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        const val = channelData[i];
        sum += val * val;
      }
      const rms = Math.sqrt(sum / channelData.length);
      const db = 20 * Math.log10(Math.max(rms, 0.00001));

      if (db > this.peakDb) {
        this.peakDb = db;
      }
      this.sumRms += db;
      this.rmsCount++;

      analyser.getByteFrequencyData(freqData);
      if (onProgress) {
        onProgress(Math.max(0, Math.min(100, (db + 60) * 1.66)), freqData);
      }
    };

    source.connect(processor);
    const mute = this.audioCtx.createGain();
    mute.gain.value = 0;
    processor.connect(mute);
    mute.connect(this.audioCtx.destination);

    // Wait for the duration
    await new Promise((resolve) => setTimeout(resolve, durationMs));

    // Finish recording
    this.isTesting = false;
    processor.disconnect();
    source.disconnect();
    analyser.disconnect();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Assemble audio buffer for playback test
    if (this.audioCtx && this.recordedChunks.length > 0) {
      let totalLength = 0;
      for (const chunk of this.recordedChunks) {
        totalLength += chunk.length;
      }
      this.recordedBuffer = this.audioCtx.createBuffer(1, totalLength, this.audioCtx.sampleRate);
      const channel = this.recordedBuffer.getChannelData(0);
      let offset = 0;
      for (const chunk of this.recordedChunks) {
        channel.set(chunk, offset);
        offset += chunk.length;
      }
    }

    const avgDb = this.rmsCount > 0 ? this.sumRms / this.rmsCount : -100;
    const hasAudioInput = this.peakDb > -45; // signal detected above typical silence floor

    let backgroundNoiseLevel: 'low' | 'moderate' | 'high' = 'low';
    if (avgDb > -25) {
      backgroundNoiseLevel = 'high';
    } else if (avgDb > -38) {
      backgroundNoiseLevel = 'moderate';
    }

    return {
      peakDb: Math.round(this.peakDb),
      avgDb: Math.round(avgDb),
      hasAudioInput,
      backgroundNoiseLevel,
    };
  }

  /**
   * Plays back the recorded test sample so user can verify audio quality
   */
  public async playTestSample(onEnded?: () => void): Promise<void> {
    if (!this.recordedBuffer) {
      throw new Error('No recorded test audio available. Run test first.');
    }

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const playCtx = new AudioCtxClass();
    if (playCtx.state === 'suspended') {
      await playCtx.resume();
    }

    const source = playCtx.createBufferSource();
    source.buffer = this.recordedBuffer;
    source.connect(playCtx.destination);
    source.onended = () => {
      try {
        playCtx.close();
      } catch {}
      onEnded?.();
    };
    source.start(0);
  }

  public cleanup(): void {
    this.isTesting = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }
}
