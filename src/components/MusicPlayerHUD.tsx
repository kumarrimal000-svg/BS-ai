import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, X } from 'lucide-react';

interface MusicPlayerHUDProps {
  externalCommand?: { type: 'play' | 'pause' | 'next' | 'previous' | 'volume' | 'mute'; val?: any } | null;
  onClose?: () => void;
}

const PLAYLIST = [
  { id: 1, title: 'Sassy Cyber Vibes', artist: 'Tamanna Beats', duration: '2:45' },
  { id: 2, title: 'Midnight Neon Skyline', artist: 'Cyber Daze', duration: '3:12' },
  { id: 3, title: 'Flirty Synth Groove', artist: 'Retro Velvet', duration: '2:58' },
  { id: 4, title: 'Electric Whispers', artist: 'Pulse AI', duration: '3:30' },
];

export const MusicPlayerHUD: React.FC<MusicPlayerHUDProps> = ({ externalCommand, onClose }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [volume, setVolume] = useState<number>(75);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [minimized, setMinimized] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const synthTimerRef = useRef<any>(null);

  const track = PLAYLIST[currentTrackIndex];

  // Synth musical generator for real playable sound
  const startSynthMelody = () => {
    stopSynthMelody();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.value = isMuted ? 0 : (volume / 100) * 0.15;
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // Looping melody notes (pentatonic neon scale)
      const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 440.00, 392.00];
      let step = 0;

      const playNote = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[step % notes.length], ctx.currentTime);

        noteGain.gain.setValueAtTime(0.2, ctx.currentTime);
        noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        step++;
      };

      synthTimerRef.current = setInterval(playNote, 420);
    } catch (e) {
      console.warn('[MusicPlayer] Web Audio Synth init error:', e);
    }
  };

  const stopSynthMelody = () => {
    if (synthTimerRef.current) {
      clearInterval(synthTimerRef.current);
      synthTimerRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
  };

  useEffect(() => {
    if (isPlaying) {
      startSynthMelody();
    } else {
      stopSynthMelody();
    }
    return () => {
      stopSynthMelody();
    };
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        isMuted ? 0 : (volume / 100) * 0.15,
        audioCtxRef.current.currentTime
      );
    }
  }, [volume, isMuted]);

  // Handle external voice commands dispatched via tool registry
  useEffect(() => {
    if (!externalCommand) return;
    switch (externalCommand.type) {
      case 'play':
        setIsPlaying(true);
        break;
      case 'pause':
        setIsPlaying(false);
        break;
      case 'next':
        setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length);
        setIsPlaying(true);
        break;
      case 'previous':
        setCurrentTrackIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
        setIsPlaying(true);
        break;
      case 'volume':
        if (typeof externalCommand.val === 'number') {
          setVolume((v) => Math.max(0, Math.min(100, v + externalCommand.val)));
        }
        break;
      case 'mute':
        setIsMuted((m) => (externalCommand.val !== undefined ? externalCommand.val : !m));
        break;
    }
  }, [externalCommand]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-28 left-4 z-40 bg-slate-900/90 border border-pink-500/40 text-pink-400 p-2.5 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 transition-transform backdrop-blur-md"
        title="Open Tamanna Media Player"
      >
        <Music className={`w-4 h-4 ${isPlaying ? 'animate-bounce' : ''}`} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 z-40 w-72 bg-slate-950/95 border border-pink-500/30 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="font-semibold text-xs text-white truncate">{track.title}</div>
            <div className="text-[10px] text-slate-400 truncate">{track.artist}</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 text-xs font-mono"
            title="Minimize"
          >
            _
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Equalizer Bars */}
      <div className="flex items-center justify-center gap-1 h-3 mb-2">
        {[40, 75, 55, 90, 65, 80, 45].map((h, i) => (
          <div
            key={i}
            className={`w-1 rounded-full bg-pink-500 transition-all duration-300 ${
              isPlaying ? 'animate-pulse' : 'h-1 opacity-30'
            }`}
            style={{ height: isPlaying ? `${h}%` : '20%' }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1">
          <button
            onClick={prevTrack}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            className="p-2 rounded-full bg-pink-600 hover:bg-pink-500 text-white shadow-md active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={nextTrack}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Volume & Mute */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-slate-400 hover:text-white p-1"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-14 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
        </div>
      </div>
    </div>
  );
};
