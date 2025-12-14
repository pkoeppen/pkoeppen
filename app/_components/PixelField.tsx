"use client";

import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import useSections from "../_hooks/useSections";
// @ts-expect-error shader loading defined in next.config.ts
import fragmentShader from "../_shaders/shader.frag";
// @ts-expect-error shader loading defined in next.config.ts
import vertexShader from "../_shaders/shader.vert";
import { frameData, keyframes } from "../frameData";

type PixelFieldProps = {
  timelineRef: React.RefObject<GSAPTimeline | null>;
  getProgress: () => number;
};

export function PixelField({ timelineRef, getProgress }: PixelFieldProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const { width, height, frames } = frameData;
  const instanceCount = width * height;
  const currentFrameRef = useRef(0);
  const currentKeyframeRef = useRef(0);

  // todo: upload all frames to GPU memory at once?
  const setBufferAttributesByFrame = useCallback(
    (frameIndex: number, geometry: THREE.InstancedBufferGeometry) => {
      if (frameIndex >= frames.length) return;

      const offsets = new Float32Array(instanceCount * 2);
      const colors = new Float32Array(instanceCount * 3);
      const alphas = new Float32Array(instanceCount);

      let i = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++, i++) {
          // center the grid around (0,0)
          const px = x - width / 2;
          const py = height / 2 - y;

          offsets[i * 2 + 0] = px;
          offsets[i * 2 + 1] = py;

          const index = y * width + x;
          const [r, g, b, a] = frames[frameIndex][index];

          colors[i * 3 + 0] = r / 255;
          colors[i * 3 + 1] = g / 255;
          colors[i * 3 + 2] = b / 255;
          alphas[i] = a / 255;
        }
      }

      geometry.setAttribute("instanceOffset", new THREE.InstancedBufferAttribute(offsets, 2));
      geometry.setAttribute("instanceColor", new THREE.InstancedBufferAttribute(colors, 3));
      geometry.setAttribute("instanceAlpha", new THREE.InstancedBufferAttribute(alphas, 1));

      return geometry;
    },
    [frames, width, height, instanceCount],
  );

  const geometry = useMemo(() => {
    const count = width * height;
    const geometry = new THREE.InstancedBufferGeometry();

    const positions = new Float32Array([
      -0.5,
      -0.5,
      0, // v0
      0.5,
      -0.5,
      0, // v1
      0.5,
      0.5,
      0, // v2
      -0.5,
      0.5,
      0, // v3
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    geometry.instanceCount = count;
    setBufferAttributesByFrame(0, geometry);

    return geometry;
  }, [setBufferAttributesByFrame, width, height]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uWaveLength: { value: 50 },
      uAmplitude: { value: 0 },
      uBaseScale: { value: 1.0 },
    }),
    [],
  );

  const { ready, sections, normalizedViewportHeight } = useSections();

  useLayoutEffect(() => {
    if (!ready) return;
    if (!meshRef.current) return;
    if (!timelineRef.current) return;

    const tl = timelineRef.current;
    tl.clear();

    gsap.to(meshRef.current!.position, {
      x: 35,
      scrollTrigger: {
        trigger: "#about",
        start: "top 50%",
        end: "top top",
        scrub: true,
      },
      ease: "power2.inOut",
    });

    gsap.to(meshRef.current!.position, {
      x: -35,
      scrollTrigger: {
        trigger: "#work",
        start: "top bottom",
        end: "top top",
        scrub: true,
      },
      ease: "power2.inOut",
    });

    gsap.to(meshRef.current!.position, {
      y: 35,
      scrollTrigger: {
        trigger: "#skills",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      ease: "none",
    });
  }, [ready, sections, timelineRef]);

  useFrame(({ clock }) => {
    const progress = getProgress();
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uScroll.value = progress;

    const nextFrame = (() => {
      for (let i = 0; i < keyframes.length; i++) {
        const keyframe = keyframes[i];
        if (progress >= keyframe.progressStart && progress < keyframe.progressEnd) {
          currentKeyframeRef.current = i;
          // map frame range onto progress range
          return Math.floor(
            keyframe.frameStart +
              ((progress - keyframe.progressStart) /
                (keyframe.progressEnd - keyframe.progressStart)) *
                (keyframe.frameEnd - keyframe.frameStart),
          );
        }
      }

      return currentFrameRef.current;
    })();

    if (nextFrame !== currentFrameRef.current) {
      currentFrameRef.current = nextFrame;
      setBufferAttributesByFrame(nextFrame, geometry);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
