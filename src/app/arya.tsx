'use client';

import { useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';
import { SkeletonUtils } from 'three-stdlib';

const MODEL_URL = '/models/arya.glb';

type Props = { isTalking: boolean };
type GLTFWithAnims = GLTF & { animations: THREE.AnimationClip[] };

export default function Arya({ isTalking }: Props) {
  const gltf = useGLTF(MODEL_URL) as GLTFWithAnims;

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
    const idle = actions?.['IdleAnim'];
    if (!idle) return;

    idle.reset();
    idle.setLoop(THREE.LoopRepeat, Infinity);
    idle.fadeIn(0.2).play();
  }, [actions]);

  // Toggle idle <-> talk (talk contains baked lip sync now)
useEffect(() => {
  if (!actions) return;

  const idle = actions['IdleAnim'];
  const talk = actions['TalkAnim'];

  if (!idle || !talk) {
    console.warn('Missing actions. Found:', Object.keys(actions));
    return;
  }

  // Tune these to taste
  const TALK_IN = 0.25;     // talk comes in fairly quick
  const TALK_OUT = 0.45;    // talk fades out slower (prevents snap)
  const IDLE_IN = 0.65;     // idle fades in slower (more natural)
  const IDLE_OUT = 0.25;    // idle can fade out quicker
  const IDLE_DELAY_MS = 250; // tiny pause before idle returns (optional but nice)

  if (isTalking) {
    // Start talk from frame 0 so it lines up with audio start
    talk.reset();
    talk.setLoop(THREE.LoopRepeat, Infinity);
    talk.fadeIn(TALK_IN).play();

    idle.fadeOut(IDLE_OUT);
  } else {
    // Let the last mouth pose "settle" before easing back to idle
    window.setTimeout(() => {
      idle.reset();
      idle.setLoop(THREE.LoopRepeat, Infinity);
      idle.fadeIn(IDLE_IN).play();

      talk.fadeOut(TALK_OUT);
    }, IDLE_DELAY_MS);
  }
}, [isTalking, actions]);


  return <primitive object={preparedScene} />;
}

useGLTF.preload(MODEL_URL);