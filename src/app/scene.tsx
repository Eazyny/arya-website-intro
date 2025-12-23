'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, useProgress } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Arya from './arya';

function LoaderOverlay({
  canEnter,
  isFading,
  onEnter,
}: {
  canEnter: boolean;
  isFading: boolean;
  onEnter: () => void;
}) {
  const { progress } = useProgress();

  const overlayStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column' as const,
      gap: 18,
      background: 'radial-gradient(circle at center, #111 0%, #060606 70%, #000 100%)',
      color: '#fff',
      userSelect: 'none' as const,
      cursor: canEnter && !isFading ? 'pointer' : 'default',
      opacity: isFading ? 0 : 1,
      transition: 'opacity 450ms ease',
      pointerEvents: isFading ? ('none' as const) : ('auto' as const),
    }),
    [canEnter, isFading]
  );

  return (
    <div style={overlayStyle} onClick={canEnter && !isFading ? onEnter : undefined}>
      <img
        src="/loader.gif"
        alt="Loading"
        style={{
          height: 'auto',
          width: 'auto',
          maxWidth: '80vw',
          maxHeight: '50vh',
          filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.15))',
        }}
      />

      {!canEnter ? (
        <>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Loading Arya…</div>
          <div style={{ opacity: 0.65, fontSize: 12 }}>{Math.round(progress)}%</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Tap to Enter</div>
          <div style={{ opacity: 0.65, fontSize: 12 }}>(audio will play)</div>
        </>
      )}
    </div>
  );
}

export default function Scene() {
  const [isTalking, setIsTalking] = useState(false);

  // loader/enter flow
  const [entered, setEntered] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [canEnter, setCanEnter] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // This ref will be read by Arya.tsx to move her mouth (0..1)
  const talkAmpRef = useRef(0);

  // WebAudio analyser refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/welcomemessage.mp3');
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 0.9;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
      }

      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }

      audioRef.current = null;
      analyserRef.current = null;
      dataRef.current = null;
      sourceRef.current = null;
      audioCtxRef.current = null;
    };
  }, []);

  const startAnalyser = async () => {
    const el = audioRef.current;
    if (!el) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextCtor();
    }

    const ctx = audioCtxRef.current;
    await ctx.resume();

    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;

      const source = ctx.createMediaElementSource(el);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      analyserRef.current = analyser;
      sourceRef.current = source;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    const tick = () => {
      const analyser = analyserRef.current;
      const data = dataRef.current;
      if (!analyser || !data) return;

      analyser.getByteTimeDomainData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);

      const noiseFloor = 0.02;
      const gain = 6.5;
      const raw = Math.max(0, (rms - noiseFloor) * gain);
      const clamped = Math.min(1, raw);

      talkAmpRef.current = talkAmpRef.current * 0.7 + clamped * 0.3;

      rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopAnalyser = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    talkAmpRef.current = 0;
  };

  const enter = async () => {
    if (!canEnter || isFading || entered) return;

    setIsFading(true);

    // make her talk during the welcome message
    setIsTalking(true);

    const el = audioRef.current;
    if (el) {
      el.currentTime = 0;

      el.onended = () => {
        setIsTalking(false);
        stopAnalyser();
      };
    }

    try {
      await startAnalyser();
      await el?.play();
    } catch (e) {
      console.warn('Audio/analyser start issue:', e);
      setIsTalking(false);
      stopAnalyser();
    }

    window.setTimeout(() => {
      setEntered(true);
    }, 450);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!entered && <LoaderOverlay canEnter={canEnter} isFading={isFading} onEnter={enter} />}

      <Canvas
        camera={{ position: [0, 1.4, 5], fov: 40 }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 1.25, 0);
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1} />
          <directionalLight position={[3, 5, 3]} intensity={0.5} />

          <Arya isTalking={isTalking} talkAmpRef={talkAmpRef} />

          <Environment preset="city" />

          <ReadyFlag onReady={() => setCanEnter(true)} />
        </Suspense>
      </Canvas>
    </div>
  );
}

function ReadyFlag({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return null;
}
