"use client";

import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { frameData, keyframes } from "../frameData";

type PixelFieldProps = {
  getProgress: () => number;
};

export function PixelField({ getProgress }: PixelFieldProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const timeline = useRef<GSAPTimeline>(null);

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

  useLayoutEffect(() => {
    timeline.current = gsap.timeline();

    if (!meshRef.current) return;

    timeline.current.to(
      meshRef.current.position,
      {
        x: 35,
        duration: 0.25,
      },
      0,
    );

    timeline.current.to(
      meshRef.current.position,
      {
        x: -35,
        duration: 0.25,
      },
      0.25,
    );

    timeline.current.to(
      meshRef.current.position,
      {
        x: 35,
        duration: 0.25,
      },
      0.5,
    );

    timeline.current.to(
      meshRef.current.position,
      {
        x: 0,
        duration: 0.25,
      },
      0.75,
    );
  }, []);

  useFrame(({ clock }) => {
    const progress = getProgress();
    timeline.current?.progress(progress);
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

const vertexShader = `
  attribute vec2 instanceOffset;
  attribute vec3 instanceColor;
  attribute float instanceAlpha;

  uniform float uTime;
  uniform float uScroll;
  uniform float uWaveLength;
  uniform float uAmplitude;
  uniform float uBaseScale;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = instanceColor;
    vAlpha = instanceAlpha;

    // base pixel position
    vec3 pos = position;

    // diagonal coordinate
    float s = instanceOffset.x + instanceOffset.y;

    vec2 center = instanceOffset;
    float t = clamp(uTime / 0.5, 0.0, 1.0);
    float ease = smoothstep(0.0, 1.0, t);
    float distance = length(center);
    vec2 startCenter = instanceOffset * 10.0;

    // interpolate from the circle → actual position
    vec2 animatedCenter = mix(startCenter, center, ease);

    pos.xy = animatedCenter + pos.xy;

    // wave along diagonal
    float spatialPhase = (s / uWaveLength) * 6.2831853; // 2π
    float phase = spatialPhase + uTime * 0.5;
    float scale = sin(phase) * uAmplitude + uBaseScale;
    pos.xy += scale;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;
