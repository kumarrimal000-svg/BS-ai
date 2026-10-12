import React, { useEffect, useRef } from 'react';
import { AssistantState, TeaseReaction, ThemeMood } from '../types/assistant';

interface FuturisticOrbProps {
  state: AssistantState;
  themeMood: ThemeMood;
  reaction: TeaseReaction;
  getVolume: () => number;
  getFrequencyData: () => Uint8Array<ArrayBuffer>;
}

// Color schemes matching theme mood
const MOOD_COLORS: Record<ThemeMood, {
  primary: string;
  secondary: string;
  glow: string;
  ambient: string;
  particle: string;
}> = {
  magenta: {
    primary: '#ff2d87',
    secondary: '#b5179e',
    glow: 'rgba(255, 45, 135, 0.45)',
    ambient: 'rgba(181, 23, 158, 0.18)',
    particle: '#ff70a6',
  },
  cyan: {
    primary: '#00f0ff',
    secondary: '#0077b6',
    glow: 'rgba(0, 240, 255, 0.45)',
    ambient: 'rgba(0, 119, 182, 0.18)',
    particle: '#90e0ef',
  },
  violet: {
    primary: '#a855f7',
    secondary: '#6366f1',
    glow: 'rgba(168, 85, 247, 0.45)',
    ambient: 'rgba(99, 102, 241, 0.18)',
    particle: '#d8b4fe',
  },
  emerald: {
    primary: '#00ff9d',
    secondary: '#059669',
    glow: 'rgba(0, 255, 157, 0.45)',
    ambient: 'rgba(5, 150, 105, 0.18)',
    particle: '#6ee7b7',
  },
  amber: {
    primary: '#ffb703',
    secondary: '#fb8500',
    glow: 'rgba(255, 183, 3, 0.45)',
    ambient: 'rgba(251, 133, 0, 0.18)',
    particle: '#ffe380',
  },
};

export const FuturisticOrb: React.FC<FuturisticOrbProps> = ({
  state,
  themeMood,
  reaction,
  getVolume,
  getFrequencyData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const rotationRef = useRef<number>(0);
  const pulseRef = useRef<number>(0);

  const colors = MOOD_COLORS[themeMood];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const parentW = canvas.parentElement?.clientWidth || 320;
      const parentH = canvas.parentElement?.clientHeight || 320;
      const w = rect.width > 0 ? rect.width : parentW;
      const h = rect.height > 0 ? rect.height : parentH;
      canvas.width = Math.max(w, 180) * dpr;
      canvas.height = Math.max(h, 180) * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      if (!canvas || !ctx) return;
      try {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        if (width <= 0 || height <= 0) {
          ctx.restore();
          animFrameRef.current = requestAnimationFrame(render);
          return;
        }

        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.max(12, Math.min(width, height) * 0.26);

        const volume = typeof getVolume === 'function' ? getVolume() : 0;
        const freqData = typeof getFrequencyData === 'function' ? getFrequencyData() : new Uint8Array(32);

      // State-based speed and scale
      let rotationSpeed = 0.006;
      let pulseSpeed = 0.03;
      let targetGlowSize = 25;

      if (state === 'connecting') {
        rotationSpeed = 0.035;
        pulseSpeed = 0.08;
        targetGlowSize = 35;
      } else if (state === 'listening') {
        rotationSpeed = 0.012 + volume * 0.04;
        pulseSpeed = 0.04 + volume * 0.1;
        targetGlowSize = 30 + volume * 50;
      } else if (state === 'speaking') {
        rotationSpeed = 0.02 + volume * 0.06;
        pulseSpeed = 0.06 + volume * 0.15;
        targetGlowSize = 40 + volume * 70;
      } else {
        // disconnected
        rotationSpeed = 0.003;
        pulseSpeed = 0.015;
        targetGlowSize = 15;
      }

      rotationRef.current += rotationSpeed;
      pulseRef.current += pulseSpeed;

      const breathingScale = Math.sin(pulseRef.current) * 0.05 + 1.0;
      const activeRadius = baseRadius * breathingScale * (1.0 + volume * 0.4);

      // 1. Ambient Background Radial Glow
      const ambientGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        activeRadius * 0.3,
        centerX,
        centerY,
        activeRadius * 2.2
      );
      ambientGrad.addColorStop(0, colors.ambient);
      ambientGrad.addColorStop(0.6, colors.ambient.replace('0.18', '0.06'));
      ambientGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, activeRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Multi-point Audio Waveform Corona (Ring)
      const numPoints = 64;
      ctx.beginPath();
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2 + rotationRef.current;
        const freqIdx = Math.floor((i % (freqData.length / 2)));
        const freqAmp = freqData[freqIdx] ? (freqData[freqIdx] / 255.0) : 0;
        const waveOffset = state === 'speaking' || state === 'listening'
          ? freqAmp * (activeRadius * 0.45) + Math.sin(angle * 6 + pulseRef.current * 2) * (activeRadius * 0.08)
          : Math.sin(angle * 4 + pulseRef.current) * 6;

        const r = activeRadius + waveOffset;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.lineWidth = 2.5 * dpr;
      ctx.strokeStyle = colors.primary;
      ctx.shadowColor = colors.primary;
      ctx.shadowBlur = targetGlowSize * dpr;
      ctx.stroke();

      // 3. Second Intersecting Gyro-Ring
      ctx.beginPath();
      const secondaryPoints = 48;
      for (let i = 0; i <= secondaryPoints; i++) {
        const angle = (i / secondaryPoints) * Math.PI * 2 - rotationRef.current * 1.4;
        const wobble = Math.sin(angle * 3 + pulseRef.current) * (activeRadius * 0.06);
        const r = activeRadius * 0.82 + wobble;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r * 0.65; // tilted ellipse

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeStyle = colors.secondary;
      ctx.shadowColor = colors.secondary;
      ctx.shadowBlur = (targetGlowSize * 0.7) * dpr;
      ctx.stroke();

      // 4. Central Holographic Core
      const coreGrad = ctx.createRadialGradient(
        centerX - activeRadius * 0.2,
        centerY - activeRadius * 0.2,
        activeRadius * 0.05,
        centerX,
        centerY,
        activeRadius * 0.65
      );

      if (state === 'speaking') {
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, colors.primary);
        coreGrad.addColorStop(0.8, colors.secondary);
        coreGrad.addColorStop(1, 'rgba(10, 12, 20, 0.9)');
      } else if (state === 'listening') {
        coreGrad.addColorStop(0, '#e0f7ff');
        coreGrad.addColorStop(0.4, colors.primary);
        coreGrad.addColorStop(0.85, colors.secondary);
        coreGrad.addColorStop(1, 'rgba(10, 12, 20, 0.9)');
      } else if (state === 'connecting') {
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.5, colors.secondary);
        coreGrad.addColorStop(1, 'rgba(10, 12, 20, 0.95)');
      } else {
        // disconnected
        coreGrad.addColorStop(0, 'rgba(180, 190, 210, 0.3)');
        coreGrad.addColorStop(0.5, 'rgba(60, 70, 95, 0.25)');
        coreGrad.addColorStop(1, 'rgba(10, 12, 20, 0.95)');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, activeRadius * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = colors.primary;
      ctx.shadowBlur = (targetGlowSize * 1.2) * dpr;
      ctx.fill();

      // 5. Tech Accent Orbital Ticks
      const tickCount = 12;
      for (let t = 0; t < tickCount; t++) {
        const tickAngle = (t / tickCount) * Math.PI * 2 + rotationRef.current * 0.5;
        const tickR1 = activeRadius * 1.22;
        const tickR2 = activeRadius * 1.30;
        const tx1 = centerX + Math.cos(tickAngle) * tickR1;
        const ty1 = centerY + Math.sin(tickAngle) * tickR1;
        const tx2 = centerX + Math.cos(tickAngle) * tickR2;
        const ty2 = centerY + Math.sin(tickAngle) * tickR2;

        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.lineWidth = 1.2 * dpr;
        ctx.strokeStyle = t % 3 === 0 ? colors.primary : 'rgba(255, 255, 255, 0.15)';
        ctx.shadowBlur = 0;
        ctx.stroke();
      }

        ctx.restore();
      } catch (e) {
        console.warn('[FuturisticOrb] Render canvas frame handled:', e);
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, themeMood, colors]);

  // Tease reaction badge or visual flare
  const getReactionEmoji = () => {
    switch (reaction) {
      case 'wink': return '😉';
      case 'smirk': return '😏';
      case 'heart': return '💖';
      case 'sparkle': return '✨';
      case 'giggle': return '🤭';
      case 'pout': return '😚';
      case 'tease': return '😜';
      default: return null;
    }
  };

  const reactionEmoji = getReactionEmoji();

  return (
    <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center mx-auto select-none">
      {/* 60FPS Reactive Soundwave Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0 pointer-events-none"
      />

      {/* Center Persona Status Indicator */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-300">
        {/* Dynamic Reaction Popover */}
        {reactionEmoji && (
          <div className="animate-bounce mb-2 text-3xl filter drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]">
            {reactionEmoji}
          </div>
        )}

        <div className="text-xs tracking-[0.25em] font-semibold uppercase text-slate-300/80 mb-0.5 font-mono">
          {state === 'disconnected' && 'TAMANNA READY'}
          {state === 'connecting' && 'CALIBRATING'}
          {state === 'listening' && 'TAMANNA LISTENING'}
          {state === 'speaking' && 'TAMANNA SPEAKING'}
        </div>

        <div className="text-[11px] text-slate-400/60 font-mono tracking-wider">
          {state === 'disconnected' && 'TAP CORE TO WAKE'}
          {state === 'connecting' && 'CONNECTING LIVE VOICE'}
          {state === 'listening' && 'SPEAK FREELY'}
          {state === 'speaking' && 'VOICE-TO-VOICE'}
        </div>
      </div>
    </div>
  );
};
