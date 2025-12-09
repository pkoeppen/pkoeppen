"use client";

import React from "react";

import useSections from "../_hooks/useSections";

type GridBackgroundProps = {
  getProgress: () => number;
};

export default function GridBackground({ getProgress }: GridBackgroundProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRangeRef = React.useRef(0);
  const lastProgressRef = React.useRef(0);
  const virtualScrollYRef = React.useRef(0);

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

    const handleResize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      updateScrollRange();
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

      for (let row = firstRow; row <= lastRow; row++) {
        const yWorld = row * spacing;
        const yScreen = yWorld - scrollY; // simulate infinite scroll

        for (let x = 0; x <= w + spacing; x += spacing) {
          const xWorld = x;
          const xScreen = xWorld; // no horizontal scroll

          const scale = 0.0025; // lower = bigger blobs
          const speed = 0.0002;
          const n = fbm2(xWorld * scale + time * speed, yWorld * scale + time * speed, 5); // ~[-5.6,5.6]
          const v = clamp(Math.pow((n / 5.6) * 0.5 + 0.5, 3), 0, 0.15);

          const radius = 200;
          const distance = Math.hypot(xScreen - (mouseX ?? 0), yScreen - (mouseY ?? 0));
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
          ctx.moveTo(xScreen, yScreen - (arm + arm * proximity));
          ctx.lineTo(xScreen, yScreen + (arm + arm * proximity));
          // horizontal line
          ctx.moveTo(xScreen - (arm + arm * proximity), yScreen);
          ctx.lineTo(xScreen + (arm + arm * proximity), yScreen);

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
