import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  Send,
  Mic,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  HelpCircle,
  FileText,
  AlertCircle,
  Upload,
  ArrowLeft,
  Zap,
  Layers,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { BSCameraService, CameraAnalysisResult, CameraChatTurn } from '../services/bsCameraService';

interface BSCameraScreenProps {
  onBackToHome: () => void;
  onSendVoicePrompt?: (prompt: string) => void;
}

export const BSCameraScreen: React.FC<BSCameraScreenProps> = ({
  onBackToHome,
  onSendVoicePrompt,
}) => {
  const cameraService = BSCameraService.getInstance();

  // Camera hardware state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [permissionErrorMsg, setPermissionErrorMsg] = useState<string>('');
  
  // Scanning mode: general (object/gadget/plant), ocr (books/docs), study (homework/math)
  const [scanMode, setScanMode] = useState<'general' | 'ocr' | 'study'>('general');

  // Photo & Analysis state
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(() => cameraService.getLastCapturedPhoto());
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<CameraAnalysisResult | null>(() => cameraService.getLastAnalysis());
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Spoken voice playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Continuous Q&A Chat State
  const [chatHistory, setChatHistory] = useState<CameraChatTurn[]>(() => {
    const prev = cameraService.getLastAnalysis();
    if (prev) {
      return [
        {
          id: `turn-init`,
          role: 'assistant',
          text: prev.summary,
          spokenText: prev.spokenResponse,
          timestamp: Date.now(),
        },
      ];
    }
    return [];
  });
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isAnalyzing, isAsking]);

  // Clean up camera stream and voice on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      cameraService.stopSpeaking();
    };
  }, []);

  // Start Camera
  const startCamera = async (targetFacing = facingMode) => {
    stopCamera();
    setPermissionErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setPermissionState('granted');
    } catch (err: any) {
      console.warn('[BS Camera] Camera access error:', err);
      setCameraActive(false);
      setPermissionState('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionErrorMsg(
          'कैमरा अनुमति अस्वीकार कर दी गई है। कृपया ब्राउज़र सेटिंग्स में जाकर कैमरा एक्सेस चालू करें, या नीचे से फ़ोटो अपलोड करें।'
        );
      } else {
        setPermissionErrorMsg(
          'कैमरा शुरू करने में समस्या आई। डिवाइस कैमरा किसी अन्य ऐप में व्यस्त हो सकता है।'
        );
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (cameraActive) {
      startCamera(nextFacing);
    }
  };

  // Capture photo from video feed
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhoto(dataUrl);
    cameraService.setLastCapturedPhoto(dataUrl);
    cameraService.setLastAnalysis(null);
    stopCamera();
    setAnalysisResult(null);
    setChatHistory([]);
    setAnalysisError(null);
  };

  // Upload photo from gallery
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCapturedPhoto(dataUrl);
        cameraService.setLastCapturedPhoto(dataUrl);
        cameraService.setLastAnalysis(null);
        stopCamera();
        setAnalysisResult(null);
        setChatHistory([]);
        setAnalysisError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Retake or Clear scan
  const handleClearScan = () => {
    cameraService.stopSpeaking();
    setIsPlayingAudio(false);
    setCapturedPhoto(null);
    cameraService.setLastCapturedPhoto(null);
    cameraService.setLastAnalysis(null);
    setAnalysisResult(null);
    setChatHistory([]);
    setAnalysisError(null);
    startCamera();
  };

  // Analyze Image with AI
  const handleAnalyzeImage = async () => {
    if (!capturedPhoto) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    cameraService.stopSpeaking();

    try {
      const result = await cameraService.analyzeImage(capturedPhoto, scanMode);
      setAnalysisResult(result);
      cameraService.setLastAnalysis(result);
      
      // Add first turn to chat
      const firstTurn: CameraChatTurn = {
        id: `turn-${Date.now()}`,
        role: 'assistant',
        text: result.summary,
        spokenText: result.spokenResponse,
        timestamp: Date.now(),
      };
      setChatHistory([firstTurn]);

      // Automatically speak Tamanna's Hindi spoken response
      if (result.spokenResponse) {
        playSpokenResponse(result.spokenResponse);
      }
    } catch (err: any) {
      console.error('[BS Camera] Analysis error:', err);
      setAnalysisError(err.message || 'तस्वीर का विश्लेषण करने में समस्या आई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Speak out text in Hindi
  const playSpokenResponse = (text: string) => {
    if (!text) return;
    setIsPlayingAudio(true);
    cameraService.speakText(
      text,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false)
    );
  };

  const toggleAudio = (text?: string) => {
    if (isPlayingAudio) {
      cameraService.stopSpeaking();
      setIsPlayingAudio(false);
    } else {
      const targetText = text || analysisResult?.spokenResponse || '';
      if (targetText) {
        playSpokenResponse(targetText);
      }
    }
  };

  // Ask Continuous Question about Scanned Image
  const handleAskQuestion = async (customQ?: string) => {
    const q = (customQ || questionInput).trim();
    if (!q || !capturedPhoto || isAsking) return;

    setQuestionInput('');
    cameraService.stopSpeaking();
    setIsPlayingAudio(false);

    // Append user question to chat
    const userTurn: CameraChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: q,
      timestamp: Date.now(),
    };
    setChatHistory((prev) => [...prev, userTurn]);
    setIsAsking(true);

    try {
      const historyPayload = chatHistory.map((t) => ({
        question: t.role === 'user' ? t.text : '',
        answer: t.role === 'assistant' ? t.text : '',
      }));

      const response = await cameraService.askQuestion(
        capturedPhoto,
        q,
        historyPayload,
        analysisResult || undefined
      );

      const assistantTurn: CameraChatTurn = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.answer,
        spokenText: response.spokenResponse,
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, assistantTurn]);

      if (response.suggestedQuestions?.length && analysisResult) {
        setAnalysisResult((prev) => (prev ? { ...prev, suggestedQuestions: response.suggestedQuestions } : prev));
      }

      // Speak response out loud in Hindi
      if (response.spokenResponse) {
        playSpokenResponse(response.spokenResponse);
      }
    } catch (err: any) {
      console.error('[BS Camera] Ask error:', err);
      const errorTurn: CameraChatTurn = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: 'माफ़ कीजिए, सवाल का जवाब तैयार करने में समस्या आई। क्या आप दोबारा पूछ सकते हैं?',
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, errorTurn]);
    } finally {
      setIsAsking(false);
    }
  };

  // Web Speech API Voice Dictation for Asking Questions
  const toggleVoiceDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setPermissionErrorMsg('आपके ब्राउज़र में वॉइस स्पीच रिकग्निशन उपलब्ध नहीं है। कृपया लिखकर सवाल पूछें।');
      return;
    }

    if (isVoiceListening) {
      setIsVoiceListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsVoiceListening(true);
      };

      recognition.onresult = (e: any) => {
        const transcript = e.results[0]?.[0]?.transcript;
        if (transcript) {
          setQuestionInput(transcript);
          handleAskQuestion(transcript);
        }
        setIsVoiceListening(false);
      };

      recognition.onerror = () => {
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech Recognition init failed:', err);
      setIsVoiceListening(false);
    }
  };

  // Copy OCR text to clipboard
  const handleCopyOcr = () => {
    if (!analysisResult?.ocrText) return;
    navigator.clipboard.writeText(analysisResult.ocrText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden relative select-none pb-20">
      {/* 1. BS Camera Top Header Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-pink-500/20 z-20">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onBackToHome}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="वापस होम पर जाएं"
          >
            <ArrowLeft className="w-5 h-5 text-pink-400" />
          </button>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-base font-bold bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 bg-clip-text text-transparent">
                BS Camera
              </span>
              <span className="text-xs">📷</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold tracking-wider uppercase">
                AI Vision
              </span>
            </div>
            <p className="text-[10px] text-slate-400">स्कैन करें, समझें और तमन्ना से सवाल पूछें</p>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-1.5">
          {cameraActive && !capturedPhoto && (
            <button
              onClick={toggleCameraFacing}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-all active:scale-95 border border-slate-700"
              title="कैमरा बदलें (आगे/पीछे)"
            >
              <RotateCcw className="w-4 h-4 text-pink-400" />
            </button>
          )}

          {capturedPhoto && (
            <button
              onClick={handleClearScan}
              className="px-2.5 py-1 text-xs rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 flex items-center space-x-1 active:scale-95 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Clear Scan</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Scan Mode Selector Pills */}
      {!capturedPhoto && (
        <div className="flex items-center justify-around px-3 py-2 bg-slate-900/60 border-b border-slate-800 text-xs">
          <button
            onClick={() => setScanMode('general')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full transition-all ${
              scanMode === 'general'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/30 font-medium'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>वस्तु व चीजें (Object)</span>
          </button>
          <button
            onClick={() => setScanMode('ocr')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full transition-all ${
              scanMode === 'ocr'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/30 font-medium'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>किताब व OCR</span>
          </button>
          <button
            onClick={() => setScanMode('study')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full transition-all ${
              scanMode === 'study'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/30 font-medium'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>पढ़ाई व सवाल</span>
          </button>
        </div>
      )}

      {/* 3. Main Viewport Area (Camera Viewfinder OR Captured Preview & Results) */}
      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar relative p-3 space-y-3">
        {/* CASE A: No Photo Captured Yet -> Camera Viewfinder */}
        {!capturedPhoto && (
          <div className="flex-1 flex flex-col justify-between items-center w-full min-h-[360px]">
            {/* Viewfinder Frame */}
            <div className="relative w-full aspect-[4/3] max-h-[380px] bg-slate-900 rounded-3xl overflow-hidden border-2 border-pink-500/30 shadow-[0_0_30px_rgba(244,114,182,0.15)] flex items-center justify-center">
              {/* Video Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'} ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Holographic Laser Scan Lines (Active animation) */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Glowing Laser Scan Bar */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_12px_#ec4899] animate-[bounce_3s_infinite]" />
                  
                  {/* Viewfinder Target Reticle Corners */}
                  <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-pink-400 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-pink-400 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-pink-400 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-pink-400 rounded-br-lg" />

                  {/* Mode Indicator Tag */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-950/70 border border-pink-500/40 text-[10px] text-pink-300 font-medium backdrop-blur-sm">
                    {scanMode === 'general' && 'वस्तु, पौधे या चीज़ पर फोकस करें'}
                    {scanMode === 'ocr' && 'किताब या लिखे शब्दों पर रखें'}
                    {scanMode === 'study' && 'सवाल या पन्ने पर फोकस करें'}
                  </div>
                </div>
              )}

              {/* Camera Inactive / Permission Prompt State */}
              {!cameraActive && (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-200">कैमरा शुरू करें</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      किसी भी वस्तु, किताब, कागज या चीज़ को स्कैन करने के लिए कैमरा चालू करें।
                    </p>
                  </div>

                  {permissionErrorMsg && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs text-left flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>{permissionErrorMsg}</div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs pt-1">
                    <button
                      onClick={() => startCamera()}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 text-white font-medium text-sm shadow-lg shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Open Camera (कैमरा चालू करें)</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <Upload className="w-3.5 h-3.5 text-pink-400" />
                      <span>गैलरी से फ़ोटो चुनें</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Viewfinder Bottom Controls when Camera is Active */}
            {cameraActive && (
              <div className="w-full py-4 flex flex-col items-center space-y-3">
                <div className="flex items-center justify-center space-x-6">
                  {/* Gallery upload alternative button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white active:scale-90 transition-all"
                    title="गैलरी से अपलोड करें"
                  >
                    <Upload className="w-5 h-5 text-pink-400" />
                  </button>

                  {/* Main Glowing Shutter Button */}
                  <button
                    onClick={capturePhoto}
                    aria-label="Capture Photo"
                    className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 p-1 shadow-[0_0_28px_rgba(244,63,94,0.6)] active:scale-90 hover:scale-105 transition-all flex items-center justify-center border-4 border-white"
                  >
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white">
                        <Camera className="w-5 h-5" />
                      </div>
                    </div>
                  </button>

                  {/* Flip Camera Button */}
                  <button
                    onClick={toggleCameraFacing}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white active:scale-90 transition-all"
                    title="कैमरा पलटें"
                  >
                    <RotateCcw className="w-5 h-5 text-pink-400" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 text-center font-medium">
                  तस्वीर खींचने के लिए बीच वाला बटन दबाएँ
                </p>
              </div>
            )}
          </div>
        )}

        {/* CASE B: Photo Captured -> Preview, AI Analysis & Continuous Q&A */}
        {capturedPhoto && (
          <div className="flex-1 flex flex-col space-y-3">
            {/* Captured Photo Card with Controls */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-pink-500/30 shadow-lg">
              <img
                src={capturedPhoto}
                alt="Captured Scan Preview"
                className="w-full max-h-48 object-cover object-center"
              />

              {/* Overlay Badge & Actions */}
              <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-pink-500/30 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-pink-300">फोटो प्रीव्यू (Photo Preview)</span>
              </div>

              <div className="absolute top-2 right-2 flex items-center space-x-1.5">
                <button
                  onClick={handleClearScan}
                  className="px-2 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md text-slate-300 hover:text-rose-400 text-[11px] border border-slate-700 flex items-center space-x-1 transition-all"
                  title="दोबारा फोटो लें"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Scan Again</span>
                </button>
              </div>

              {/* Analyze Image Action Bar (if not analyzed yet) */}
              {!analysisResult && !isAnalyzing && (
                <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-col space-y-2">
                  <button
                    onClick={handleAnalyzeImage}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg shadow-pink-500/30 active:scale-95 transition-all flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4 animate-spin text-pink-200" />
                    <span>Analyze Image (AI विश्लेषण करें)</span>
                  </button>
                  <p className="text-[11px] text-center text-slate-400">
                    तमन्ना इस तस्वीर को देखकर इसके उपयोग, विशेषताएँ और सवाल-जवाब समझाएगी।
                  </p>
                </div>
              )}
            </div>

            {/* Loading Spinner during AI Analysis */}
            {isAnalyzing && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-950/30 to-purple-950/30 border border-pink-500/40 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full border-4 border-pink-500/20 border-t-pink-500 animate-spin flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-pink-300">तमन्ना तस्वीर देख रही है...</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    वस्तु की पहचान, लिखावट (OCR) और व्याख्या तैयार हो रही है।
                  </p>
                </div>
              </div>
            )}

            {/* Error Message if Analysis Failed */}
            {analysisError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <div>{analysisError}</div>
                  <button
                    onClick={handleAnalyzeImage}
                    className="mt-2 px-3 py-1 bg-rose-700/60 hover:bg-rose-700 text-white rounded-lg text-xs"
                  >
                    पुनः प्रयास करें (Retry)
                  </button>
                </div>
              </div>
            )}

            {/* AI Analysis Cards and Spoken Response */}
            {analysisResult && (
              <div className="space-y-3">
                {/* 1. Header Card with Hindi Spoken Voice Player */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 border border-pink-500/30 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-medium">
                        पहचान (Identified)
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">
                        {analysisResult.title}
                      </h3>
                    </div>

                    {/* Spoken Audio Toggle Button */}
                    <button
                      onClick={() => toggleAudio()}
                      className={`p-2.5 rounded-xl border flex items-center space-x-1.5 transition-all active:scale-95 ${
                        isPlayingAudio
                          ? 'bg-pink-600 text-white border-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.6)] animate-pulse'
                          : 'bg-slate-800 text-pink-300 border-pink-500/30 hover:bg-slate-700'
                      }`}
                      title={isPlayingAudio ? 'आवाज़ रोकें' : 'तमन्ना की आवाज़ में सुनें'}
                    >
                      {isPlayingAudio ? (
                        <>
                          <VolumeX className="w-4 h-4" />
                          <span className="text-xs font-semibold">बोल रही है...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span className="text-xs font-medium">बोलकर सुनो</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Summary Text */}
                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    {analysisResult.summary}
                  </p>
                </div>

                {/* 2. Detailed Explanation & Practical Usage */}
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-1.5 text-pink-400 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>उपयोग और मुख्य विशेषताएँ (Usage & Details)</span>
                  </div>
                  <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                    {analysisResult.detailedExplanation}
                  </div>
                  {analysisResult.usageGuide && (
                    <div className="mt-2 p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200">
                      <span className="font-semibold block mb-0.5 text-pink-300">इसे कैसे इस्तेमाल करें:</span>
                      {analysisResult.usageGuide}
                    </div>
                  )}
                </div>

                {/* 3. OCR Text Extracted (If text found in image) */}
                {analysisResult.ocrText && (
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-xs">
                        <FileText className="w-3.5 h-3.5" />
                        <span>तस्वीर में लिखा पाठ (OCR Text)</span>
                      </div>
                      <button
                        onClick={handleCopyOcr}
                        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] border border-cyan-500/30 flex items-center space-x-1"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>कॉपी हो गया!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>कॉपी करें</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/80 text-xs text-slate-300 font-mono overflow-x-auto max-h-32 overflow-y-auto leading-relaxed border border-slate-800 select-text">
                      {analysisResult.ocrText}
                    </div>
                  </div>
                )}

                {/* 4. Study / Homework Solution (If academic/math problem) */}
                {analysisResult.studySolution && (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-xs">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>कदम-दर-कदम समाधान (Step-by-Step Solution)</span>
                    </div>
                    <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                      {analysisResult.studySolution}
                    </div>
                  </div>
                )}

                {/* 5. Continuous Question & Answer Chat Area */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-pink-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <HelpCircle className="w-4 h-4 text-pink-400" />
                      <span className="text-xs font-bold text-slate-100">
                        Ask Tamanna (इस तस्वीर पर सवाल पूछें)
                      </span>
                    </div>
                    <span className="text-[10px] text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                      संदर्भ याद रखा जाएगा
                    </span>
                  </div>

                  {/* Chat turns scroll view */}
                  <div
                    ref={chatScrollRef}
                    className="max-h-60 overflow-y-auto no-scrollbar space-y-2.5 pr-1"
                  >
                    {chatHistory.map((turn) => (
                      <div
                        key={turn.id}
                        className={`flex flex-col ${
                          turn.role === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[88%] p-2.5 rounded-2xl text-xs leading-relaxed ${
                            turn.role === 'user'
                              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-br-none shadow-md shadow-pink-600/20'
                              : 'bg-slate-800/90 text-slate-200 rounded-bl-none border border-slate-700/80'
                          }`}
                        >
                          <div className="whitespace-pre-line">{turn.text}</div>

                          {/* Speak button for assistant turns */}
                          {turn.role === 'assistant' && turn.spokenText && (
                            <div className="mt-2 pt-1 border-t border-slate-700/50 flex items-center justify-between">
                              <button
                                onClick={() => playSpokenResponse(turn.spokenText || turn.text)}
                                className="text-[10px] text-pink-300 hover:text-pink-200 flex items-center space-x-1 active:scale-95"
                              >
                                <Volume2 className="w-3 h-3" />
                                <span>दोबारा सुनें (Listen again)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Asking AI thinking indicator */}
                    {isAsking && (
                      <div className="flex items-center space-x-2 p-2 bg-slate-800/60 rounded-xl max-w-[70%]">
                        <div className="w-3 h-3 rounded-full bg-pink-500 animate-ping" />
                        <span className="text-xs text-pink-300">तमन्ना जवाब सोच रही है...</span>
                      </div>
                    )}
                  </div>

                  {/* Suggested Quick Question Chips */}
                  {analysisResult.suggestedQuestions && analysisResult.suggestedQuestions.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">सुझाए गए सवाल:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {analysisResult.suggestedQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAskQuestion(q)}
                            disabled={isAsking}
                            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-pink-900/40 text-slate-300 hover:text-pink-200 text-[11px] border border-slate-700 hover:border-pink-500/40 transition-all active:scale-95 text-left"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAskQuestion();
                    }}
                    className="flex items-center space-x-1.5 pt-1"
                  >
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={questionInput}
                        onChange={(e) => setQuestionInput(e.target.value)}
                        placeholder="तमन्ना से इस फोटो के बारे में पूछें..."
                        disabled={isAsking}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-pink-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Microphone Voice Input Button */}
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className={`p-2 rounded-xl border transition-all active:scale-95 ${
                        isVoiceListening
                          ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-pink-400 border-slate-700'
                      }`}
                      title="बोलकर सवाल पूछें"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!questionInput.trim() || isAsking}
                      className="p-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 disabled:hover:bg-pink-600 text-white shadow-md shadow-pink-500/30 transition-all active:scale-95"
                      title="सवाल भेजें"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
