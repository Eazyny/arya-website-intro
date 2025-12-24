'use client';

import { useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';
import { SkeletonUtils } from 'three-stdlib';

const MODEL_URL = '/models/arya.glb';

type Props = { isTalking: boolean };
type GLTFWithAnims = GLTF & { animations: THREE.AnimationClip[] };

type MorphableMesh = THREE.Mesh & {
  morphTargetDictionary?: Record<string, number>;
  morphTargetInfluences?: number[];
};

type BlinkTarget = {
  mesh: MorphableMesh;
  idxL: number;
  idxR: number;
};

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function Arya({ isTalking }: Props) {
  const gltf = useGLTF(MODEL_URL) as GLTFWithAnims;

  const idleTimerRef = useRef<number | null>(null);

  // ---- Blink refs ----
  const blinkTargetsRef = useRef<BlinkTarget[]>([]);
  const nextBlinkAtRef = useRef<number>(0);
  const blinkPhaseRef = useRef<'idle' | 'closing' | 'hold' | 'opening'>('idle');
  const phaseStartRef = useRef<number>(0);
  const doDoubleRef = useRef<boolean>(false);
  const doubleQueuedRef = useRef<boolean>(false);

  const preparedScene = useMemo(() => {
    const root = SkeletonUtils.clone(gltf.scene) as THREE.Object3D;

    // Shoes fix + hair stability (your working setup)
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const mesh = obj as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      const isShoes = mesh.name === 'Canvas_shoes.001' || mesh.name.includes('Canvas_shoes');
      const isHair = mesh.name === 'Side_part_wavy.001' || mesh.name.includes('Side_part_wavy');

      if (!isShoes && !isHair) return;

      materials.forEach((mat) => {
        const m = mat as THREE.MeshStandardMaterial;

        if (isShoes) {
          m.side = THREE.DoubleSide;
          m.transparent = false;
          m.opacity = 1;
          m.alphaTest = 0;
          m.depthWrite = true;
          m.depthTest = true;
          m.needsUpdate = true;
        }

        if (isHair) {
          m.side = THREE.DoubleSide;
          m.transparent = true;
          m.opacity = 1;
          m.depthWrite = false;
          m.depthTest = true;
          m.alphaTest = 0;
          m.needsUpdate = true;
        }
      });
    });

    return root;
  }, [gltf.scene]);

  const { actions } = useAnimations(gltf.animations, preparedScene);

  // Start idle once actions exist
  useEffect(() => {
    if (!actions) return;

    const idle = actions['IdleAnim'];
    if (!idle) return;

    idle.reset();
    idle.setLoop(THREE.LoopRepeat, Infinity);
    idle.fadeIn(0.2).play();

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [actions]);

  // Toggle idle <-> talk using crossfades (prevents A-pose flash)
  useEffect(() => {
    if (!actions) return;

    const idle = actions['IdleAnim'];
    const talk = actions['TalkAnim'];

    if (!idle || !talk) {
      console.warn('Missing actions. Found:', Object.keys(actions));
      return;
    }

    // Clear any pending "return to idle"
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    // Tune these to taste
    const TALK_IN = 0.25; // idle -> talk
    const BACK_FADE = 0.65; // talk -> idle
    const IDLE_DELAY_MS = 250; // pause before returning to idle

    if (isTalking) {
      // Ensure idle is running so crossfade has something to blend from
      if (!idle.isRunning()) {
        idle.reset();
        idle.setLoop(THREE.LoopRepeat, Infinity);
        idle.play();
      }

      // Start talk from frame 0 so it lines up with audio start
      talk.reset();
      talk.setLoop(THREE.LoopRepeat, Infinity);
      talk.play();

      // Crossfade Idle -> Talk (no dead gap)
      talk.crossFadeFrom(idle, TALK_IN, false);
    } else {
      // Keep talk weighted during the delay to avoid A-pose flash.
      // Then crossfade Talk -> Idle.
      idleTimerRef.current = window.setTimeout(() => {
        // Ensure talk is still running for the blend
        if (!talk.isRunning()) {
          talk.reset();
          talk.setLoop(THREE.LoopRepeat, Infinity);
          talk.play();
        }

        idle.reset();
        idle.setLoop(THREE.LoopRepeat, Infinity);
        idle.play();

        idle.crossFadeFrom(talk, BACK_FADE, false);

        idleTimerRef.current = null;
      }, IDLE_DELAY_MS);
    }

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [isTalking, actions]);

  // Collect blink morph targets once per prepared scene
  useEffect(() => {
    const targets: BlinkTarget[] = [];

    preparedScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const mesh = obj as MorphableMesh;
      const dict = mesh.morphTargetDictionary;
      const infl = mesh.morphTargetInfluences;

      if (!dict || !infl) return;

      const idxL = dict['Eye_Blink_L'];
      const idxR = dict['Eye_Blink_R'];

      if (typeof idxL === 'number' && typeof idxR === 'number') {
        infl[idxL] = 0;
        infl[idxR] = 0;
        targets.push({ mesh, idxL, idxR });
      }
    });

    blinkTargetsRef.current = targets;

    // schedule first blink a bit after load
    nextBlinkAtRef.current = randRange(1.2, 2.6);
    blinkPhaseRef.current = 'idle';
    doDoubleRef.current = false;
    doubleQueuedRef.current = false;

    if (targets.length === 0) {
      console.warn('No blink morph targets found: Eye_Blink_L / Eye_Blink_R');
    }
  }, [preparedScene]);

  // Procedural blink (only touches blink indices)
  useFrame(({ clock }) => {
    const targets = blinkTargetsRef.current;
    if (!targets.length) return;

    const t = clock.getElapsedTime();

    // timings
    const BLINK_MIN = 2.4;
    const BLINK_MAX = 5.8;

    const CLOSE_DUR = 0.075;
    const HOLD_DUR = 0.03;
    const OPEN_DUR = 0.09;

    const DOUBLE_CHANCE = 0.18;
    const DOUBLE_GAP = 0.18;

    const setBlink = (v: number) => {
      for (const { mesh, idxL, idxR } of targets) {
        const infl = mesh.morphTargetInfluences;
        if (!infl) continue;
        infl[idxL] = v;
        infl[idxR] = v;
      }
    };

    // start blink?
    if (blinkPhaseRef.current === 'idle') {
      if (t < nextBlinkAtRef.current) return;

      blinkPhaseRef.current = 'closing';
      phaseStartRef.current = t;
      doDoubleRef.current = Math.random() < DOUBLE_CHANCE;
      doubleQueuedRef.current = false;
    }

    const phase = blinkPhaseRef.current;
    const dt = t - phaseStartRef.current;

    if (phase === 'closing') {
      const p = THREE.MathUtils.clamp(dt / CLOSE_DUR, 0, 1);
      setBlink(p * p); // ease-in
      if (p >= 1) {
        blinkPhaseRef.current = 'hold';
        phaseStartRef.current = t;
      }
      return;
    }

    if (phase === 'hold') {
      setBlink(1);
      if (dt >= HOLD_DUR) {
        blinkPhaseRef.current = 'opening';
        phaseStartRef.current = t;
      }
      return;
    }

    if (phase === 'opening') {
      const p = THREE.MathUtils.clamp(dt / OPEN_DUR, 0, 1);
      const eased = 1 - (1 - p) * (1 - p); // ease-out
      setBlink(1 - eased);

      if (p >= 1) {
        setBlink(0);
        blinkPhaseRef.current = 'idle';

        // schedule next blink
        if (doDoubleRef.current && !doubleQueuedRef.current) {
          doubleQueuedRef.current = true;
          nextBlinkAtRef.current = t + DOUBLE_GAP; // quick second blink
          doDoubleRef.current = false; // don't chain doubles
        } else {
          nextBlinkAtRef.current = t + randRange(BLINK_MIN, BLINK_MAX);
        }
      }
    }
  });

  return <primitive object={preparedScene} />;
}

useGLTF.preload(MODEL_URL);
