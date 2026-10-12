/**
 * BS Camera Service
 * Handles AI Vision analysis, continuous multimodal Q&A, OCR text extraction,
 * and Hindi spoken voice synthesis for Tamanna Assistant.
 */

export interface CameraAnalysisResult {
  title: string;
  category: 'object' | 'text_document' | 'study_problem' | 'nature_plant' | 'electronics' | 'other';
  ocrText?: string;
  summary: string;
  detailedExplanation: string;
  usageGuide?: string;
  studySolution?: string;
  spokenResponse: string;
  suggestedQuestions: string[];
}

export interface CameraChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  spokenText?: string;
  timestamp: number;
}

export class BSCameraService {
  private static instance: BSCameraService;
  private currentSpeechUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingActive: boolean = false;

  private lastCapturedImage: string | null = null;
  private lastAnalysis: CameraAnalysisResult | null = null;

  private constructor() {
    this.loadPersistedScan();
  }

  public static getInstance(): BSCameraService {
    if (!BSCameraService.instance) {
      BSCameraService.instance = new BSCameraService();
    }
    return BSCameraService.instance;
  }

  private loadPersistedScan() {
    if (typeof window === 'undefined') return;
    try {
      const savedImg = localStorage.getItem('tamanna_last_camera_photo');
      if (savedImg) this.lastCapturedImage = savedImg;
      const savedAnalysis = localStorage.getItem('tamanna_last_camera_analysis');
      if (savedAnalysis) this.lastAnalysis = JSON.parse(savedAnalysis);
    } catch {}
  }

  public setLastCapturedPhoto(imageDataUrl: string | null) {
    this.lastCapturedImage = imageDataUrl;
    if (typeof window !== 'undefined') {
      try {
        if (imageDataUrl) {
          // If imageDataUrl is too large for localStorage, slice or store in memory
          if (imageDataUrl.length < 2000000) {
            localStorage.setItem('tamanna_last_camera_photo', imageDataUrl);
          }
        } else {
          localStorage.removeItem('tamanna_last_camera_photo');
        }
      } catch {}
    }
  }

  private liveFrameProvider: (() => string | null) | null = null;

  public registerLiveFrameProvider(provider: (() => string | null) | null): void {
    this.liveFrameProvider = provider;
  }

  public getCurrentLiveFrame(): string | null {
    if (this.liveFrameProvider) {
      const live = this.liveFrameProvider();
      if (live) return live;
    }
    return this.lastCapturedImage;
  }

  public getLastCapturedPhoto(): string | null {
    return this.getCurrentLiveFrame();
  }

  public setLastAnalysis(result: CameraAnalysisResult | null) {
    this.lastAnalysis = result;
    if (typeof window !== 'undefined') {
      try {
        if (result) {
          localStorage.setItem('tamanna_last_camera_analysis', JSON.stringify(result));
        } else {
          localStorage.removeItem('tamanna_last_camera_analysis');
        }
      } catch {}
    }
  }

  public getLastAnalysis(): CameraAnalysisResult | null {
    return this.lastAnalysis;
  }

  /**
   * Generates real camera vision context for the LiveSession and Voice Assistant
   */
  public generateCameraVisionLiveAugment(): string {
    const activeFrame = this.getCurrentLiveFrame();
    if (!activeFrame && !this.lastAnalysis) {
      return '[BS CAMERA VISION CONTEXT]: Camera preview is not open or no visual feed has started yet. If the user asks what is in the camera or what you see, warmly suggest: "कृपया BS Camera 📷 खोलें, मैं तुरंत देखकर बता दूँगी!"';
    }

    const lines: string[] = [
      '[BS CAMERA REAL-TIME LIVE VISION AI CONTEXT — ACTIVE LIVE STREAM]:',
      `- Live Vision Status: Real camera feed is LIVE. Tamanna receives live frames directly from the phone viewfinder.`,
    ];

    if (this.lastAnalysis) {
      lines.push(
        `- Latest Identified Object / Visual: "${this.lastAnalysis.title}" (Category: ${this.lastAnalysis.category})`,
        `- Real-time Summary: ${this.lastAnalysis.summary}`,
        `- Detailed Explanation: ${this.lastAnalysis.detailedExplanation.slice(0, 350)}...`,
        `- Usage & Purpose: ${this.lastAnalysis.usageGuide || 'N/A'}`
      );
      if (this.lastAnalysis.ocrText) {
        lines.push(`- Extracted OCR Text from camera: "${this.lastAnalysis.ocrText.slice(0, 300)}"`);
      }
      if (this.lastAnalysis.studySolution) {
        lines.push(`- Academic/Problem Solution: ${this.lastAnalysis.studySolution.slice(0, 300)}`);
      }
    } else {
      lines.push(
        `- Live Camera viewfinder is actively running in real-time.`,
        `- When the user shows any object or asks "Tamanna, yeh kya hai?" or "तुम्हें कैमरे में क्या दिख रहा है?", invoke the tool "analyzeCameraVision" or explain the visual directly. You CAN see the live camera feed!`
      );
    }

    lines.push(
      `- STRICT INSTRUCTION: Tamanna HAS active live vision through BS Camera. NEVER say "I cannot see" or "I have no eyes". Identify the object or invoke analyzeCameraVision immediately with cheerful confidence!`
    );

    return lines.join('\n');
  }

  /**
   * Send captured image to backend Vision AI for deep multimodal analysis & OCR
   */
  public async analyzeImage(
    imageDataUrl: string,
    mode: 'general' | 'ocr' | 'study' = 'general',
    customPrompt?: string
  ): Promise<CameraAnalysisResult> {
    const response = await fetch('/api/camera/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageDataUrl,
        mode,
        customPrompt,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Network request failed' }));
      throw new Error(errData.details || errData.error || `Server responded with ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Ask follow-up questions while retaining full context of the scanned photo
   */
  public async askQuestion(
    imageDataUrl: string,
    question: string,
    history: Array<{ question: string; answer: string }>,
    previousAnalysis?: Partial<CameraAnalysisResult>
  ): Promise<{
    answer: string;
    spokenResponse: string;
    suggestedQuestions: string[];
    extractedOcr?: string;
  }> {
    const response = await fetch('/api/camera/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageDataUrl,
        question,
        history,
        previousAnalysis,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Network request failed' }));
      throw new Error(errData.details || errData.error || `Server responded with ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Speak out Tamanna's answer in natural Hindi / Hinglish voice
   */
  public speakText(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }

    this.stopSpeaking();

    // Clean markdown/symbols for smoother natural pronunciation
    const cleanSpeech = text
      .replace(/[#*_~`>[\]()]/g, ' ')
      .replace(/[\n\r]+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSpeech) return false;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      this.currentSpeechUtterance = utterance;

      // Detect available voices and prefer Hindi (hi-IN) or Indian English
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(
        (v) =>
          v.lang.startsWith('hi') ||
          v.name.toLowerCase().includes('hindi') ||
          v.name.toLowerCase().includes('india')
      );

      if (hindiVoice) {
        utterance.voice = hindiVoice;
        utterance.lang = hindiVoice.lang || 'hi-IN';
      } else {
        utterance.lang = 'hi-IN';
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Warm, friendly female cadence

      utterance.onstart = () => {
        this.isSpeakingActive = true;
        onStart?.();
      };

      utterance.onend = () => {
        this.isSpeakingActive = false;
        this.currentSpeechUtterance = null;
        onEnd?.();
      };

      utterance.onerror = (e) => {
        console.warn('[BSCamera TTS] Speech error:', e);
        this.isSpeakingActive = false;
        this.currentSpeechUtterance = null;
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn('[BSCamera TTS] Speech synthesis exception:', err);
      return false;
    }
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isSpeakingActive = false;
    this.currentSpeechUtterance = null;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingActive;
  }
}
