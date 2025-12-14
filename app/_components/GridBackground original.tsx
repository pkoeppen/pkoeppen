"use client";

import React from "react";
import { smoothstep } from "three/src/math/MathUtils.js";

import useSections from "../_hooks/useSections";
import { useLayoutStore } from "../_stores/layoutStore";

type GridBackgroundProps = {
  getProgress: () => number;
};

export default function GridBackground({ getProgress }: GridBackgroundProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRangeRef = React.useRef(0);
  const lastProgressRef = React.useRef(0);
  const virtualScrollYRef = React.useRef(0);
  const gridStateRef = React.useRef<{
    rowBaseWorldY: Float32Array;
    rowWorldIndex: Int32Array;
    x0: Float32Array;
    y0: Float32Array;
    x: Float32Array;
    y: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
  } | null>(null);

  const updateScrollRange = () => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;
    scrollRangeRef.current = Math.max(0, scrollContainer.scrollHeight - window.innerHeight);
  };

  const { ready, sections, normalizedViewportHeight } = useSections();

  React.useLayoutEffect(() => {
    if (!ready) return;

    const canvas = canvasRef.current;
    scrollContainerRef.current = document.querySelector("#smooth-content");

    if (!canvas || !scrollContainerRef.current) return;

    const ctx = canvas.getContext("2d")!;

    let mouseX: number | null = null;
    let mouseY: number | null = null;

    const allocateGridState = (width: number, height: number) => {
      const SPACING = 36;

      const cols = Math.ceil(width / SPACING);
      const rowsVisible = Math.ceil(height / SPACING);
      const rowsAllocated = rowsVisible + 2;

      const N = cols * rowsAllocated;

      const x0 = new Float32Array(N);
      const y0 = new Float32Array(N);
      const x = new Float32Array(N);
      const y = new Float32Array(N);
      const vx = new Float32Array(N);
      const vy = new Float32Array(N);

      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = c * SPACING;
          const py = r * SPACING;

          x0[i] = x[i] = px;
          y0[i] = y[i] = py;
          vx[i] = vy[i] = 0;
          i++;
        }
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      updateScrollRange();
      allocateGridState(window.innerWidth / 36, window.innerHeight / 36);
    };

    const handlePointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove);

    let frameId: number;

    const spacing = 36;
    const crossSize = 6;
    const lineWidth = 1;
    const arm = crossSize / 2;

    function calculateEasingMultiplier(): number {
      const progress = getProgress(); // 0..1

      const topOfScreen = progress * (1 - normalizedViewportHeight);
      const bottomOfScreen = topOfScreen + normalizedViewportHeight;

      lastProgressRef.current = progress;

      const range = normalizedViewportHeight * 0.5; // how much progress around the section we use for easing
      let multiplier = 1;

      for (const section of sections) {
        if (section.static || section.height === 100) continue;

        const sectionTop = section.startNorm;
        const sectionBottom = section.endNorm;

        const topStart = sectionTop - range; // start slowing here
        const topEnd = sectionTop; // fully stopped when we reach top
        const bottomStart = sectionBottom - range; // start speeding up here
        const bottomEnd = sectionBottom; // fully sped up when we reach bottom

        if (topOfScreen >= topStart && topOfScreen <= topEnd) {
          // top of screen is in top range
          const t = (topOfScreen - topStart) / (topEnd - topStart);
          multiplier = Math.pow(1 - t, 2);
          break;
        } else if (topOfScreen >= sectionTop && bottomOfScreen < bottomStart) {
          // fully stopped
          multiplier = 0;
          break;
        } else if (bottomOfScreen >= bottomStart && bottomOfScreen < bottomEnd) {
          // bottom of screen is in bottom range
          let t = (bottomOfScreen - bottomStart) / (bottomEnd - bottomStart);
          t = Math.max(0, Math.min(1, t));
          multiplier = t * t;
          break;
        }
      }

      return multiplier;
    }

    function renderCrosses(time: number) {
      if (!canvas) return;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const w = window.innerWidth;
      const h = window.innerHeight;

      const isDark = document.documentElement.classList.contains("dark");
      const baseStroke = isDark ? "255,255,255" : "0,0,0";

      const progress = getProgress(); // 0..1
      const scrollRange = scrollRangeRef.current; // total world height in px or whatever

      const deltaProgress = progress - lastProgressRef.current;
      lastProgressRef.current = progress;

      const easingMultiplier = calculateEasingMultiplier();
      virtualScrollYRef.current += deltaProgress * scrollRange * easingMultiplier;

      const scrollY = virtualScrollYRef.current;

      const firstRow = Math.floor(scrollY / spacing) - 1;
      const lastRow = firstRow + Math.ceil(h / spacing) + 2;

      // Get hovered element once per frame
      let timeSinceHoveredElementStart = 0;
      const { hoveredElementBoundingRect, hoveredElementStart } = useLayoutStore.getState();

      const hoveredElementLeft = hoveredElementBoundingRect?.left;
      const hoveredElementTop = hoveredElementBoundingRect?.top;
      const hoveredElementRight = hoveredElementBoundingRect?.right;
      const hoveredElementBottom = hoveredElementBoundingRect?.bottom;

      if (hoveredElementStart) {
        timeSinceHoveredElementStart = performance.now() - hoveredElementStart;
      }

      for (let row = firstRow; row <= lastRow; row++) {
        const yWorld = row * spacing;
        const yScreen = yWorld - scrollY; // simulate infinite scroll

        for (let x = 0; x <= w + spacing; x += spacing) {
          const xWorld = x;
          const xScreen = xWorld; // no horizontal scroll

          let yScreenRepelled = yScreen;
          let xScreenRepelled = xScreen;

          // Apply repulsion if there's a hovered element
          if (
            hoveredElementLeft !== undefined &&
            hoveredElementTop !== undefined &&
            hoveredElementRight !== undefined &&
            hoveredElementBottom !== undefined
          ) {
            const cx = Math.max(hoveredElementLeft, Math.min(xScreen, hoveredElementRight));
            const cy = Math.max(hoveredElementTop, Math.min(yScreen, hoveredElementBottom));

            const dx = xScreen - cx;
            const dy = yScreen - cy;

            const distanceOutside = Math.hypot(dx, dy);

            const distanceLeft = xScreen - hoveredElementLeft;
            const distanceRight = hoveredElementRight - xScreen;
            const distanceTop = yScreen - hoveredElementTop;
            const distanceBottom = hoveredElementBottom - yScreen;

            const distanceInside = Math.min(
              distanceLeft,
              distanceRight,
              distanceTop,
              distanceBottom,
            );

            const inside =
              xScreen >= hoveredElementLeft &&
              xScreen <= hoveredElementRight &&
              yScreen >= hoveredElementTop &&
              yScreen <= hoveredElementBottom;
            const signedDistance = inside ? -distanceInside : distanceOutside;

            let dirx = 0,
              diry = 0;

            if (!inside) {
              const len = Math.hypot(dx, dy) || 1;
              dirx = dx / len;
              diry = dy / len;
            } else {
              // choose nearest side
              if (distanceInside === distanceLeft) {
                dirx = -1;
                diry = 0;
              } else if (distanceInside === distanceRight) {
                dirx = 1;
                diry = 0;
              } else if (distanceInside === distanceTop) {
                dirx = 0;
                diry = -1;
              } else if (distanceInside === distanceBottom) {
                dirx = 0;
                diry = 1;
              }
            }

            const distToSurface = inside ? distanceInside : distanceOutside;

            const t = distToSurface / 100;
            const strength = 1 - smoothstep(0, 1, t);

            const maxPush = 20;
            const push = strength * maxPush;
            xScreenRepelled += dirx * push;
            yScreenRepelled += diry * push;

            //

            // const dx = xScreen - hoveredElementCenterX;
            // const dy = yScreen - hoveredElementCenterY;

            // if (row === 0) {
            //   console.log(
            //     JSON.stringify(
            //       {
            //         yWorld: yWorld.toFixed(2),
            //         scrollY: scrollY.toFixed(2),
            //         hoveredElementCenterX: hoveredElementCenterX.toFixed(2),
            //         hoveredElementCenterY: hoveredElementCenterY.toFixed(2),
            //         xScreen: xScreen.toFixed(2),
            //         yScreen: yScreen.toFixed(2),
            //         dx: dx.toFixed(2),
            //         dy: dy.toFixed(2),
            //       },
            //       null,
            //       2,
            //     ),
            //   );
            // }

            // const distanceSquared = dx * dx + dy * dy;
            // const repulsionRadiusSquared = repulsionRadius * repulsionRadius;

            // // Only apply repulsion if the cross is within the repulsion radius
            // if (distanceSquared < repulsionRadiusSquared && distanceSquared > 0) {
            //   const distance = Math.sqrt(distanceSquared);

            //   // Normalize the direction vector (from center to cross)
            //   const normalizedDx = dx / distance;
            //   const normalizedDy = dy / distance;

            //   // Calculate repulsion strength (stronger when closer, weaker when farther)
            //   // Using inverse square falloff for smooth bubble effect
            //   const normalizedDistance = distance / repulsionRadius;
            //   const repulsionStrength = (1 - normalizedDistance) * (1 - normalizedDistance);
            //   const maxDisplacement = 20; // Maximum pixels to push the cross

            //   // Apply repulsion in the direction away from center
            //   xScreenRepelled += normalizedDx * repulsionStrength * maxDisplacement;
            //   yScreenRepelled += normalizedDy * repulsionStrength * maxDisplacement;
            // }
          }

          const scale = 0.0025; // lower = bigger blobs
          const speed = 0.0002;
          const n = fbm2(xWorld * scale + time * speed, yWorld * scale + time * speed, 5); // ~[-5.6,5.6]
          const v = clamp(Math.pow((n / 5.6) * 0.5 + 0.5, 3), 0, 0.15);

          const radius = 200;
          const distance = Math.hypot(
            xScreenRepelled - (mouseX ?? 0),
            yScreenRepelled - (mouseY ?? 0),
          );
          const proximity = Math.max(0, Math.min(1, 1 - distance / radius));
          const alpha = clamp(v + proximity, 0, 0.5);

          if (alpha < 0.03) {
            continue; // skip very low alpha to save overdraw
          }

          ctx.strokeStyle = `rgba(${baseStroke},${alpha})`;
          ctx.lineWidth = lineWidth;

          // draw a "+" centered at (x, y)
          ctx.beginPath();
          // vertical line
          ctx.moveTo(xScreenRepelled, yScreenRepelled - (arm + arm * proximity));
          ctx.lineTo(xScreenRepelled, yScreenRepelled + (arm + arm * proximity));
          // horizontal line
          ctx.moveTo(xScreenRepelled - (arm + arm * proximity), yScreenRepelled);
          ctx.lineTo(xScreenRepelled + (arm + arm * proximity), yScreenRepelled);

          ctx.stroke();
        }
      }
    }

    function tick(now: number) {
      renderCrosses(now);
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", handleResize);
      //window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(frameId);
    };
  }, [ready, sections, normalizedViewportHeight, getProgress]);

  return (
    <div className="bg-background pointer-events-none fixed inset-0 z-0">
      <canvas ref={canvasRef} />
    </div>
  );
}

function makePermutation(seed = 1337): Uint8Array {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let n, q;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    n = seed % (i + 1);
    q = p[i];
    p[i] = p[n];
    p[n] = q;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

const PERM = makePermutation();

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? 2 * v : -2 * v);
}

function perlin2(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;

  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[X] + Y];
  const ab = PERM[PERM[X] + Y + 1];
  const ba = PERM[PERM[X + 1] + Y];
  const bb = PERM[PERM[X + 1] + Y + 1];

  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);

  return lerp(x1, x2, v);
}

export function fbm2(x: number, y: number, octaves = 5, lacunarity = 1, gain = 1): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;

  for (let i = 0; i < octaves; i++) {
    sum += amp * perlin2(x * freq, y * freq);
    freq *= lacunarity;
    amp *= gain;
  }
  return sum;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
