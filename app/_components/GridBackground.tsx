"use client";

import React from "react";

import useSections from "../_hooks/useSections";
import { useLayoutStore } from "../_stores/layoutStore";

const SPACING = 36;
const BUFFER_ROWS = 2;
const CROSS_SIZE = 6;
const LINE_WIDTH = 1;
const ARM = CROSS_SIZE / 2;

const REPEL_RADIUS = 200;
const REPEL_MARGIN = 5;
const REPEL_STIFFNESS = 800;
const REPEL_DAMPING = 1;
const REPEL_RETURN_STIFFNESS = 40;
const REPEL_RETURN_DAMPING = 2 * Math.sqrt(REPEL_RETURN_STIFFNESS);

const NOISE_SCALE = 0.0025; // lower = bigger blobs
const NOISE_SPEED = 0.0002;

const MOUSE_EFFECT_RADIUS = 200;

type HoverField = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  invRx2: number;
  invRy2: number;
  invExtentX2: number;
  invExtentY2: number;
};

function expEase01(t: number, k = 4) {
  t = Math.max(0, Math.min(1, t));
  if (k <= 0) return t;
  return (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
}

type LUT = { p: Float32Array; y: Float32Array };

/**
 * Build a lookup table for mapping true scroll progress to grid background "eased" progress.
 * @param samples - The number of samples to generate.
 * @param scrollRange - The range of the scroll container progress in pixels.
 * @param m - The easing function.
 * @param scale - The scale to apply to the scroll progress; effectively shrinks or expands scroll range for parallax effect.
 *                Scale <1 = content scrolls faster, >1 = grid scrolls faster.
 * @returns The lookup table.
 */
function buildLUT(
  samples: number,
  scrollRange: number,
  m: (p: number) => number,
  scale?: number,
): LUT {
  const p = new Float32Array(samples); // progress
  const y = new Float32Array(samples); // scrollY

  let area = 0;
  p[0] = 0;
  y[0] = 0;

  for (let i = 1; i < samples; i++) {
    const p0 = (i - 1) / (samples - 1);
    const p1 = i / (samples - 1);
    const m0 = m(p0);
    const m1 = m(p1);

    area += (p1 - p0) * 0.5 * (m0 + m1); // trapezoid integral
    p[i] = p1;
    y[i] = area * scrollRange;
  }

  if (scale) {
    for (let i = 0; i < samples; i++) y[i] *= scale;
  }

  return { p, y };
}

function sampleLUT(lut: LUT, progress: number): number {
  const n = lut.p.length;
  const x = clamp(progress, 0, 1);
  const f = x * (n - 1);
  const i0 = Math.floor(f);
  const i1 = Math.min(n - 1, i0 + 1);
  const t = f - i0;
  return lut.y[i0] + (lut.y[i1] - lut.y[i0]) * t;
}

/**
 * Compute the distance to the perimeter of a bounding box ellipse, along with a radial direction vector.
 * @param px - The x coordinate of the point.
 * @param py - The y coordinate of the point.
 * @param rect - The rectangle to compute the distance to.
 * @param padX - The padding to add to the x radius.
 * @param padY - The padding to add to the y radius.
 * @returns The distance to the perimeter and the normalized radial direction vector.
 */
function computeDistToEllipsePerimeter(hoverField: HoverField, px: number, py: number) {
  const vx = px - hoverField.cx;
  const vy = py - hoverField.cy;

  const d2Cull = vx * vx * hoverField.invExtentX2 + vy * vy * hoverField.invExtentY2;
  if (d2Cull > 1) return null;

  const len = Math.hypot(vx, vy);

  // if point is exactly at center, direction is undefined.
  // pick a stable default (up)
  if (len < 1e-8) {
    const dist = Math.min(hoverField.rx, hoverField.ry);
    return { signedDistToPerimeter: -dist, dirx: 0, diry: -1 };
  }

  const dirx = vx / len;
  const diry = vy / len;

  // scale factor to reach ellipse surface along ray cast from center
  const scale = Math.sqrt(vx * vx * hoverField.invRx2 + vy * vy * hoverField.invRy2);
  if (scale < 1e-8) {
    const dist = Math.min(hoverField.rx, hoverField.ry);
    return { signedDistToPerimeter: -dist, dirx, diry };
  }

  const inside = scale < 1;

  // distance from point to ellipse perimeter along the ray
  const dist = len * Math.abs(1 - 1 / scale);

  return { signedDistToPerimeter: inside ? -dist : dist, dirx, diry, inside };
}

type GridBackgroundProps = {
  getProgress: () => number;
};

type GridState = {
  // immutable (unless resized)
  cols: number;
  rowsVisible: number;
  rowsAlloc: number;
  N: number;
  head: number;
  lastTopWorldRow: number;
  // updated every frame
  x0: Float32Array;
  y0: Float32Array;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  rowWorldIndex: Int32Array;
};

export default function GridBackground({ getProgress }: GridBackgroundProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRangeRef = React.useRef(0);
  const virtualScrollYRef = React.useRef(0);
  const mouseXYRef = React.useRef<{ x: number; y: number } | null>(null);
  const lastTimeRef = React.useRef<number | null>(null);
  const baseStrokeRef = React.useRef<string>("0,0,0");
  const gridRef = React.useRef<GridState | null>(null);
  const lutRef = React.useRef<LUT | null>(null);

  const { ready: sectionsReady, sections, normalizedViewportHeight } = useSections();

  const allocateGrid = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const css = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(css.width * dpr));
    canvas.height = Math.max(1, Math.floor(css.height * dpr));

    const cols = Math.max(1, Math.ceil(css.width / SPACING));
    const rowsVisible = Math.max(1, Math.ceil(css.height / SPACING));
    const rowsAlloc = rowsVisible + BUFFER_ROWS * 2;
    const N = cols * rowsAlloc;

    const x0 = new Float32Array(N); // "home" x
    const y0 = new Float32Array(N); // "home" y
    const x = new Float32Array(N); // actual (world) x
    const y = new Float32Array(N); // actual (world) y
    const vx = new Float32Array(N);
    const vy = new Float32Array(N);
    const rowWorldIndex = new Int32Array(rowsAlloc);

    const topWorldRow = Math.floor(virtualScrollYRef.current / SPACING);
    const startWorldRow = topWorldRow - BUFFER_ROWS;

    for (let r = 0; r < rowsAlloc; r++) {
      const worldRow = startWorldRow + r;
      rowWorldIndex[r] = worldRow;
      const wy = worldRow * SPACING;

      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const wx = c * SPACING;
        x0[i] = x[i] = wx;
        y0[i] = y[i] = wy;
      }
    }

    gridRef.current = {
      cols,
      rowsVisible,
      rowsAlloc,
      N,
      head: 0,
      lastTopWorldRow: topWorldRow,
      x0,
      y0,
      x,
      y,
      vx,
      vy,
      rowWorldIndex,
    };
  }, []);

  const reassignRowWorld = React.useCallback((r: number, worldRow: number) => {
    const grid = gridRef.current;
    if (!grid) return;

    grid.rowWorldIndex[r] = worldRow;
    const wy = worldRow * SPACING;

    const base = r * grid.cols;
    for (let c = 0; c < grid.cols; c++) {
      const i = base + c;
      grid.y0[i] = grid.y[i] = wy;
      grid.vx[i] = 0;
      grid.vy[i] = 0;
    }
  }, []);

  const shiftDownOne = React.useCallback(
    (topWorldRow: number) => {
      const grid = gridRef.current;
      if (!grid) return;

      grid.head = (grid.head + 1) % grid.rowsAlloc;

      const wrappedRow = (grid.head + grid.rowsAlloc - 1) % grid.rowsAlloc;
      const newWorldRow = topWorldRow + grid.rowsVisible + BUFFER_ROWS - 1;

      reassignRowWorld(wrappedRow, newWorldRow);
    },
    [reassignRowWorld],
  );

  const shiftUpOne = React.useCallback(
    (topWorldRow: number) => {
      const grid = gridRef.current;
      if (!grid) return;

      grid.head = (grid.head + grid.rowsAlloc - 1) % grid.rowsAlloc;

      const wrappedRow = grid.head;
      const newWorldRow = topWorldRow - BUFFER_ROWS;

      reassignRowWorld(wrappedRow, newWorldRow);
    },
    [reassignRowWorld],
  );

  const calculateScrollEasingMultiplier = React.useCallback(
    (progress: number): number => {
      const topOfScreen = progress * (1 - normalizedViewportHeight);
      const bottomOfScreen = topOfScreen + normalizedViewportHeight;
      const range = normalizedViewportHeight * 0.5; // how much progress around the section used for easing
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
          multiplier = 1 - expEase01(t);
          break;
        }

        if (topOfScreen >= sectionTop && bottomOfScreen <= bottomStart) {
          // fully stopped
          multiplier = 0;
          break;
        }

        if (bottomOfScreen >= bottomStart && bottomOfScreen <= bottomEnd) {
          // bottom of screen is in bottom range
          const t = (bottomOfScreen - bottomStart) / (bottomEnd - bottomStart);
          multiplier = expEase01(t);
          break;
        }
      }

      return multiplier;
    },
    [normalizedViewportHeight, sections],
  );

  const updateScroll = React.useCallback(() => {
    const progress = getProgress(); // 0..1
    virtualScrollYRef.current = sampleLUT(lutRef.current!, progress);
  }, [getProgress]);

  const updateWrapping = React.useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const targetTopWorldRow = Math.floor(virtualScrollYRef.current / SPACING);
    let delta = targetTopWorldRow - grid.lastTopWorldRow;
    if (delta === 0) return;

    let curTop = grid.lastTopWorldRow;

    while (delta > 0) {
      curTop += 1;
      shiftDownOne(curTop);
      delta--;
    }

    while (delta < 0) {
      curTop -= 1;
      shiftUpOne(curTop);
      delta++;
    }

    grid.lastTopWorldRow = targetTopWorldRow;
  }, [shiftDownOne, shiftUpOne]);

  const updateLUT = React.useCallback(() => {
    lutRef.current = buildLUT(1024, scrollRangeRef.current, calculateScrollEasingMultiplier, 0.5);
  }, [calculateScrollEasingMultiplier]);

  const updateScrollRange = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    scrollRangeRef.current = Math.max(0, container.scrollHeight - window.innerHeight);
  }, []);

  React.useLayoutEffect(() => {
    if (!sectionsReady) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    scrollContainerRef.current = document.querySelector("#smooth-content");
    if (!scrollContainerRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onResize = () => {
      allocateGrid();
      updateScrollRange();
      updateLUT();
    };

    const onPointerMove = (e: PointerEvent) => {
      mouseXYRef.current = { x: e.clientX, y: e.clientY };
    };

    onResize();

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove);

    let raf: number;

    const loop = (t: number) => {
      const grid = gridRef.current;
      if (!grid) {
        raf = requestAnimationFrame(loop);
        return;
      }

      updateScroll();
      updateWrapping();

      const rawDT = lastTimeRef.current == null ? 0 : (t - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDT, 1 / 30); // cap dt at 33ms
      lastTimeRef.current = t;

      const { x: mouseX, y: mouseY } = mouseXYRef.current ?? { x: 0, y: 0 };

      const rect = useLayoutStore.getState().hoveredElementBoundingRect;

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const drag = Math.exp(-REPEL_DAMPING * dt);

      let hoverField: HoverField | null = null;

      if (rect) {
        // precompute these for each frame
        const rx = (rect.right - rect.left) * 0.5 * Math.SQRT2 + REPEL_MARGIN;
        const ry = (rect.bottom - rect.top) * 0.5 * Math.SQRT2 + REPEL_MARGIN;
        const extentX = rx + REPEL_RADIUS;
        const extentY = ry + REPEL_RADIUS;
        hoverField = {
          cx: (rect.left + rect.right) * 0.5,
          cy: (rect.top + rect.bottom) * 0.5,
          rx,
          ry,
          invRx2: 1 / (rx * rx),
          invRy2: 1 / (ry * ry),
          invExtentX2: 1 / (extentX * extentX),
          invExtentY2: 1 / (extentY * extentY),
        };
      }

      for (let rr = 0; rr < grid.rowsAlloc; rr++) {
        const r = (grid.head + rr) % grid.rowsAlloc;
        const base = r * grid.cols;

        for (let c = 0; c < grid.cols; c++) {
          const i = base + c;

          let screenX = grid.x[i];
          let screenY = grid.y[i] - virtualScrollYRef.current;

          let ax = 0;
          let ay = 0;

          const returnX = grid.x0[i] - grid.x[i];
          const returnY = grid.y0[i] - grid.y[i];

          ax += returnX * REPEL_RETURN_STIFFNESS;
          ay += returnY * REPEL_RETURN_STIFFNESS;

          grid.vx[i] -= grid.vx[i] * REPEL_RETURN_DAMPING * dt;
          grid.vy[i] -= grid.vy[i] * REPEL_RETURN_DAMPING * dt;

          if (rect) {
            const result = computeDistToEllipsePerimeter(hoverField!, screenX, screenY);
            if (result) {
              const dist = result.signedDistToPerimeter;
              const penetration = Math.max(0, -dist);
              const t = (REPEL_RADIUS - dist) / REPEL_RADIUS;
              const band = clamp(t, 0, 1); // 1 near margin, 0 at MARGIN + REPEL_RADIUS

              const soft = band * band + 0.5; // sharpen near edge
              const force = penetration + 0.15 * REPEL_MARGIN * soft;
              const scale = REPEL_STIFFNESS * force;

              ax += result.dirx * scale;
              ay += result.diry * scale;
            }
          }

          if (dt > 0) {
            grid.vx[i] += ax * dt;
            grid.vy[i] += ay * dt;

            grid.vx[i] *= drag;
            grid.vy[i] *= drag;

            grid.x[i] += grid.vx[i] * dt;
            grid.y[i] += grid.vy[i] * dt;

            // update screenX and screenY
            screenX = grid.x[i];
            screenY = grid.y[i] - virtualScrollYRef.current;
          }

          const n = fbm2(
            grid.x[i] * NOISE_SCALE + t * NOISE_SPEED,
            grid.y[i] * NOISE_SCALE + t * NOISE_SPEED,
            5,
          ); // ~[-5.6,5.6]
          const v = clamp(Math.pow((n / 5.6) * 0.5 + 0.5, 3), 0, 0.15);

          const distance = Math.hypot(screenX - (mouseX ?? 0), screenY - (mouseY ?? 0));
          const proximity = Math.max(0, Math.min(1, 1 - distance / MOUSE_EFFECT_RADIUS));
          const alpha = clamp(v + proximity, 0, 0.5);

          if (alpha < 0.03) {
            continue; // skip very low alpha to save overdraw
          }

          ctx.strokeStyle = `rgba(${baseStrokeRef.current},${alpha})`;
          ctx.lineWidth = LINE_WIDTH;

          // draw a "+" centered at (x, y)
          ctx.beginPath();
          // vertical line
          ctx.moveTo(screenX, screenY - (ARM + ARM * proximity));
          ctx.lineTo(screenX, screenY + (ARM + ARM * proximity));
          // horizontal line
          ctx.moveTo(screenX - (ARM + ARM * proximity), screenY);
          ctx.lineTo(screenX + (ARM + ARM * proximity), screenY);

          ctx.stroke();

          const debug = false;
          if (rect && debug) {
            // draw ellipse
            ctx.strokeStyle = "red";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(
              hoverField!.cx,
              hoverField!.cy,
              hoverField!.rx - REPEL_MARGIN,
              hoverField!.ry - REPEL_MARGIN,
              0,
              0,
              2 * Math.PI,
            );
            ctx.stroke();
            // draw ellipse perimeter + margin
            ctx.strokeStyle = "orange";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(
              hoverField!.cx,
              hoverField!.cy,
              hoverField!.rx,
              hoverField!.ry,
              0,
              0,
              2 * Math.PI,
            );
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(raf);
    };
  }, [sectionsReady, allocateGrid, updateScrollRange, updateLUT, updateScroll, updateWrapping]);

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    baseStrokeRef.current = isDark ? "255,255,255" : "0,0,0";
  }, []);

  return (
    <div className="bg-background pointer-events-none fixed inset-0 z-0">
      <canvas ref={canvasRef} className="h-full w-full" />
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
