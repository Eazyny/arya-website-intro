'use client';

import Image from 'next/image';
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
      <Image
        src="/loader.gif"
        alt="Loading"
        width={600}
        height={600}
        unoptimized
        priority
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

  useEffect(() => {
    audioRef.current = new Audio('/welcomemessage.mp3');
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 0.9;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
      }
      audioRef.current = null;
    };
  }, []);

  const enter = async () => {
    if (!canEnter || isFading || entered) return;

    setIsFading(true);

    const el = audioRef.current;
    if (el) {
      el.currentTime = 0;

      // Talk during the welcome message
      setIsTalking(true);

      el.onended = () => {
        setIsTalking(false);
      };

      // play audio off the click so autoplay works
      try {
        await el.play();
      } catch (e) {
        console.warn('Audio play blocked (rare after click):', e);
        setIsTalking(false);
      }
    }

    // After fade, reveal the scene
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

          <Arya isTalking={isTalking} />

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
