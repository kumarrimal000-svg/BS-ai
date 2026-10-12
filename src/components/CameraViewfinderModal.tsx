import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Zap, Video, Download, Sparkles, Image as ImageIcon } from 'lucide-react';

interface CameraViewfinderModalProps {
  isOpen: boolean;
  mode: 'photo' | 'selfie' | 'video';
  onClose: () => void;
  onPhotoCaptured?: (photoUrl: string) => void;
}

export const CameraViewfinderModal: React.FC<CameraViewfinderModalProps> = ({
  isOpen,
  mode,
  onClose,
  onPhotoCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(mode === 'selfie' ? 'user' : 'environment');
  const [zoomFactor, setZoomFactor] = useState<number>(1);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (mode === 'selfie') {
      setFacingMode('user');
    }
  }, [mode]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setStatusMessage('Connecting to camera hardware...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setStatusMessage('');
    } catch (err: any) {
      console.warn('[Camera] Failed to get user media with audio, trying video-only:', err);
      try {
        const videoOnly = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
        });
        mediaStreamRef.current = videoOnly;
        if (videoRef.current) {
          videoRef.current.srcObject = videoOnly;
          videoRef.current.play().catch(() => {});
        }
        setStatusMessage('');
      } catch (videoErr: any) {
        setStatusMessage('Camera permission denied or camera device unavailable.');
      }
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If selfie, mirror canvas horizontally
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedPhoto(dataUrl);
    onPhotoCaptured?.(dataUrl);
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      // Start recording
      const stream = mediaStreamRef.current;
      if (!stream) return;
      recordedChunksRef.current = [];
      try {
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err: any) {
        console.warn('[Camera] Recording error handled:', err?.message || err);
      }
    }
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleToggleFlash = async () => {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      const newFlash = !flashOn;
      // @ts-ignore
      await track.applyConstraints({ advanced: [{ torch: newFlash }] });
      setFlashOn(newFlash);
    } catch {
      // Flash torch unsupported
      setFlashOn(!flashOn);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-950 border border-pink-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-pink-400" />
            <span className="font-bold text-sm tracking-wider uppercase text-slate-100">
              TAMANNA CAMERA VIEWFINDER
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Video Area */}
        <div className="relative aspect-[4/3] sm:aspect-video bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-transform duration-300 ${
              facingMode === 'user' ? 'scale-x-[-1]' : ''
            }`}
            style={{ transform: `${facingMode === 'user' ? 'scaleX(-1)' : ''} scale(${zoomFactor})` }}
          />

          {/* Flash screen overlay simulation if active */}
          {flashOn && (
            <div className="absolute inset-0 bg-white/20 pointer-events-none animate-pulse" />
          )}

          {/* Camera Grid Lines */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/10 opacity-30">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
          </div>

          {/* Recording Badge */}
          {isRecording && (
            <div className="absolute top-4 left-4 bg-rose-600/90 border border-white/20 text-white text-xs font-mono px-3 py-1 rounded-full flex items-center gap-2 shadow-lg animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>REC 00:0{Math.floor(Date.now() / 1000) % 10}</span>
            </div>
          )}

          {statusMessage && (
            <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center p-6 text-center text-xs text-rose-300 font-mono">
              {statusMessage}
            </div>
          )}

          {/* Captured Photo Preview Overlay */}
          {capturedPhoto && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 z-20 animate-in fade-in">
              <img
                src={capturedPhoto}
                alt="Captured"
                className="max-h-[75%] rounded-xl border border-pink-500/50 shadow-2xl mb-3 object-contain"
              />
              <div className="flex items-center gap-3">
                <a
                  href={capturedPhoto}
                  download={`tamanna_photo_${Date.now()}.jpg`}
                  className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium px-4 py-2 rounded-xl flex items-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Photo</span>
                </a>
                <button
                  onClick={() => setCapturedPhoto(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl border border-slate-700"
                >
                  Retake
                </button>
              </div>
            </div>
          )}

          {/* Recorded Video Preview Overlay */}
          {recordedVideoUrl && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 z-20 animate-in fade-in">
              <video
                src={recordedVideoUrl}
                controls
                autoPlay
                className="max-h-[75%] rounded-xl border border-pink-500/50 shadow-2xl mb-3"
              />
              <div className="flex items-center gap-3">
                <a
                  href={recordedVideoUrl}
                  download={`tamanna_video_${Date.now()}.webm`}
                  className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium px-4 py-2 rounded-xl flex items-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video</span>
                </a>
                <button
                  onClick={() => setRecordedVideoUrl(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl border border-slate-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Viewfinder Controls Bar */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          {/* Switch Camera */}
          <button
            onClick={handleSwitchCamera}
            title="Switch Front/Rear"
            className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Main Shutter / Record Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleCapturePhoto}
              title="Take Photo"
              className="w-16 h-16 rounded-full border-4 border-white bg-pink-600 hover:bg-pink-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,45,135,0.6)] active:scale-95 transition-transform"
            >
              <Camera className="w-7 h-7" />
            </button>

            <button
              onClick={handleToggleRecord}
              title={isRecording ? 'Stop Recording' : 'Record Video'}
              className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center text-white transition-all ${
                isRecording
                  ? 'bg-rose-600 animate-pulse ring-4 ring-rose-500/40'
                  : 'bg-slate-800 hover:bg-rose-600/80 border-slate-600'
              }`}
            >
              <Video className="w-5 h-5" />
            </button>
          </div>

          {/* Flash / Torch Toggle */}
          <button
            onClick={handleToggleFlash}
            title={flashOn ? 'Flash Torch ON' : 'Flash Torch OFF'}
            className={`p-3 rounded-full border transition-colors ${
              flashOn
                ? 'bg-amber-500 text-black border-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Zap className="w-5 h-5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="px-6 py-2.5 bg-slate-950 flex items-center justify-center gap-2 border-t border-slate-900 text-xs font-mono">
          {[1, 1.5, 2, 3].map((z) => (
            <button
              key={z}
              onClick={() => setZoomFactor(z)}
              className={`px-3 py-1 rounded-lg transition-colors ${
                zoomFactor === z
                  ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {z}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
