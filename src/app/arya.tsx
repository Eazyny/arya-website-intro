'use client';

import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';
import { SkeletonUtils } from 'three-stdlib';

type Props = {
  isTalking: boolean;
  talkAmpRef?: React.RefObject<number>; // 0..1 amplitude from audio
};

type GLTFWithAnims = GLTF & { animations: THREE.AnimationClip[] };

type MorphTarget = {
  mesh: THREE.Mesh;
  index: number;
};

export default function Arya({ isTalking, talkAmpRef }: Props) {
  const gltf = useGLTF('/models/arya.glb') as GLTFWithAnims;

  const preparedScene = useMemo(() => {
    const root = SkeletonUtils.clone(gltf.scene) as THREE.Object3D;

    // Shoes fix + hair stability (your current working setup)
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

  // Find morph targets once
  const lipOpenRef = useRef<MorphTarget[]>([]);
  const jawOpenRef = useRef<MorphTarget[]>([]);
  const loggedRef = useRef(false);

  useEffect(() => {
    const lipTargets: MorphTarget[] = [];
    const jawTargets: MorphTarget[] = [];

    preparedScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const mesh = obj as THREE.Mesh;
      const dict = (mesh as any).morphTargetDictionary as Record<string, number> | undefined;
      const influences = (mesh as any).morphTargetInfluences as number[] | undefined;
      if (!dict || !influences) return;

      // exact CC4 keys you showed
      if (dict['V_Lip_Open'] !== undefined) {
        lipTargets.push({ mesh, index: dict['V_Lip_Open'] });
      }

      // optional helper if present in your model
      const jawKey =
        dict['Jaw_Open'] !== undefined
          ? 'Jaw_Open'
          : dict['jawOpen'] !== undefined
          ? 'jawOpen'
          : undefined;

      if (jawKey) {
        jawTargets.push({ mesh, index: dict[jawKey] });
      }

      // one-time debug if needed
      if (!loggedRef.current && Object.keys(dict).length > 0) {
        // console.log(mesh.name, Object.keys(dict));
      }
    });

    lipOpenRef.current = lipTargets;
    jawOpenRef.current = jawTargets;

    if (!loggedRef.current) {
      loggedRef.current = true;
      if (lipTargets.length === 0) {
        console.warn('Could not find V_Lip_Open on any mesh. (Check morph keys on face mesh.)');
      } else {
        console.log('Driving V_Lip_Open on:', lipTargets.map((t) => t.mesh.name));
      }
      if (jawTargets.length > 0) {
        console.log('Also driving Jaw_Open on:', jawTargets.map((t) => t.mesh.name));
      }
    }
  }, [preparedScene]);

  // Start idle
  useEffect(() => {
    const idle = actions?.['IdleAnim'];
    if (idle) idle.reset().fadeIn(0.2).play();
  }, [actions]);

  // Toggle Idle <-> Talk
  useEffect(() => {
    if (!actions) return;

    const idle = actions['IdleAnim'];
    const talk = actions['TalkAnim'];

    if (!idle || !talk) {
      console.warn('Missing actions. Found:', Object.keys(actions));
      return;
    }

    const from = isTalking ? idle : talk;
    const to = isTalking ? talk : idle;

    to.reset().fadeIn(0.2).play();
    from.fadeOut(0.2);
  }, [isTalking, actions]);

  // Drive lip open + optional jaw open from audio
  useFrame(() => {
    const amp = talkAmpRef?.current ?? 0;

    // Small base so lips don't look sealed while she’s “talking”
    const base = isTalking ? 0.06 : 0;

    // Main open amount
    const lipOpen = isTalking ? THREE.MathUtils.clamp(base + amp * 1.25, 0, 1) : 0;

    // Jaw should be a bit less than lips, just to add realism (and not break face)
    const jawOpen = isTalking ? THREE.MathUtils.clamp(amp * 0.6, 0, 1) : 0;

    // Apply V_Lip_Open
    for (const t of lipOpenRef.current) {
      const influences = (t.mesh as any).morphTargetInfluences as number[] | undefined;
      if (!influences) continue;

      const current = influences[t.index] ?? 0;
      influences[t.index] = THREE.MathUtils.lerp(current, lipOpen, 0.35);
    }

    // Apply Jaw_Open if found
    for (const t of jawOpenRef.current) {
      const influences = (t.mesh as any).morphTargetInfluences as number[] | undefined;
      if (!influences) continue;

      const current = influences[t.index] ?? 0;
      influences[t.index] = THREE.MathUtils.lerp(current, jawOpen, 0.25);
    }
  });

  return <primitive object={preparedScene} />;
}

useGLTF.preload('/models/arya.glb');
