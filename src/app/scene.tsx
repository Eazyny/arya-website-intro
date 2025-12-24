'use client';

import Image from 'next/image';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, useProgress } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Arya from './arya';

function LoaderOverlay({
  canEnter,
  isFading,
  onEnter,
  onSfx,
}: {
  canEnter: boolean;
  isFading: boolean;
  onEnter: () => void;
  onSfx: () => void;
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
    <div
      style={overlayStyle}
      onPointerDown={canEnter && !isFading ? onSfx : undefined}
      onClick={canEnter && !isFading ? onEnter : undefined}
    >
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

/**
 * Tiny parallax / camera drift for a premium feel.
 * Super subtle: no orbit controls, always looks at Arya.
 */
function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();

    // Base camera (matches your original)
    const base = new THREE.Vector3(0, 1.4, 5);

    // Very small drift
    const drift = new THREE.Vector3(
      Math.sin(t * 0.35) * 0.14,
      Math.sin(t * 0.22) * 0.08,
      Math.cos(t * 0.28) * 0.18
    );

    camera.position.copy(base).add(drift);
    camera.lookAt(0, 1.25, 0);
  });

  return null;
}

export default function Scene() {
  const [isTalking, setIsTalking] = useState(false);

  // loader/enter flow
  const [entered, setEntered] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [canEnter, setCanEnter] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enterSfxRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/welcomemessage.mp3');
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 0.9;

    // Optional enter SFX (add public/enter.mp3). If missing, it will just fail silently.
    enterSfxRef.current = new Audio('/enter.mp3');
    enterSfxRef.current.preload = 'auto';
    enterSfxRef.current.volume = 0.35;

    return () => {
      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
      }
      audioRef.current = null;

      if (enterSfxRef.current) {
        enterSfxRef.current.pause();
      }
      enterSfxRef.current = null;
    };
  }, []);

  const playEnterSfx = () => {
    try {
      const sfx = enterSfxRef.current;
      if (!sfx) return;
      sfx.currentTime = 0;
      void sfx.play();
    } catch {
      // ignore
    }
  };

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

    // After fade, hide overlay
    fadeTimerRef.current = window.setTimeout(() => {
      setEntered(true);
      fadeTimerRef.current = null;
    }, 450);
  };

  const handleReady = useCallback(() => {
    setCanEnter(true);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!entered && (
        <LoaderOverlay
          canEnter={canEnter}
          isFading={isFading}
          onEnter={enter}
          onSfx={playEnterSfx}
        />
      )}

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.4, 5], fov: 40 }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 1.25, 0);
        }}
      >
        {/* Tiny parallax */}
        <CameraDrift />

        {/* Arya + ready gate: this Suspense resolves when the GLB resolves */}
        <Suspense fallback={null}>
          {/* Lighting upgrade (studio-ish 3-point) */}
          <ambientLight intensity={0.28} />

          {/* Key light (main) */}
          <spotLight
            position={[2.6, 4.8, 3.6]}
            intensity={1.35}
            angle={0.38}
            penumbra={0.9}
            decay={2}
            distance={25}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.00015}
          />

          {/* Fill light (soft) */}
          <spotLight
            position={[-3.2, 3.6, 4.4]}
            intensity={0.55}
            angle={0.6}
            penumbra={1}
            decay={2}
            distance={25}
          />

          {/* Rim light (separation) — softened a touch */}
          <directionalLight position={[0.2, 2.6, -4.6]} intensity={0.65} />

          {/* Optional: tiny overhead kicker to help hair separation (VERY subtle) */}
          <directionalLight position={[0, 6, 2]} intensity={0.12} />

          <Arya isTalking={isTalking} />

          <ReadyFlag onReady={handleReady} />
        </Suspense>

        {/* Environment loads separately so it doesn't block "Tap to Enter" */}
        <Suspense fallback={null}>
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}

function ReadyFlag({ onReady }: { onReady: () => void }) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    onReady();
  }, [onReady]);

  return null;
}
