"use client";

import React, { useRef } from "react";

import "./FloatingText.css";

const ORIENTATION_OFFSET = 30;

type CharState = {
  box: HTMLDivElement;
  span: HTMLSpanElement;
  char: string;
  centerX: number;
  centerY: number;
  idlePhaseX: number;
  idlePhaseY: number;
  idleFreqX: number;
  idleFreqY: number;
};

type WobblyTextProps = {
  text: string;
  orientation?: "left" | "right";
};

export default function FloatingText({ text, orientation = "left" }: WobblyTextProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const previousOffset = useRef<number | null>(null);

  React.useEffect(() => {
    const start = performance.now();
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").sort(() => Math.random() - 0.5);

    const container = containerRef.current;
    if (!container) return;

    const chars = Array.from(container.querySelectorAll<HTMLDivElement>(".char"));

    const state: CharState[] = chars.map((el) => ({
      box: el,
      span: el.querySelector<HTMLSpanElement>("span")!,
      char: el.innerText,
      centerX: 0,
      centerY: 0,
      idlePhaseX: Math.random() * Math.PI * 2,
      idlePhaseY: Math.random() * Math.PI * 2,
      idleFreqX: 0.4 + Math.random() * 0.3,
      idleFreqY: 0.4 + Math.random() * 0.3,
    }));

    let mouseX: number | null = null;
    let mouseY: number | null = null;
    const repelRadius = 500;
    const repelStrength = 24;
    const idleAmp = 10;

    const getOrientationOffset = (index: number, value: number) => {
      if (orientation === "left") {
        return index % 2 === 0 ? -value : value;
      } else {
        return index % 2 === 0 ? value : -value;
      }
    };

    const measureCenterPoints = () => {
      state.forEach((s) => {
        const rect = s.box.getBoundingClientRect();
        // screen-space center of the box
        s.centerX = rect.left + rect.width / 2;
        s.centerY = rect.top + rect.height / 2;
      });
    };

    const handleResize = () => {
      measureCenterPoints();
    };

    const handlePointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleScroll = () => {
      measureCenterPoints();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("scroll", handleScroll);

    measureCenterPoints();

    let frameId: number;
    let lastCharChange = start;

    let currentCharIndex = 0;
    const charChangeInterval = 80;
    const charChangeDuration = 100;
    const charChangeDurationBase = 500;
    const colorOffset = 0;

    const tick = (now: number) => {
      const t = now / 1000;
      const timeSinceStart = now - start;
      const timeSinceLastCharChange = now - lastCharChange;

      state.forEach((s, index) => {
        const idleX = Math.sin(t * s.idleFreqX + s.idlePhaseX) * idleAmp;
        const idleY = Math.cos(t * s.idleFreqY + s.idlePhaseY) * idleAmp;

        let repelX = 0;
        let repelY = 0;

        if (mouseX !== null && mouseY !== null) {
          const dx = s.centerX - mouseX;
          const dy = s.centerY - mouseY;
          const distance = Math.hypot(dx, dy) || 1;

          if (distance < repelRadius) {
            const force = (1 - distance / repelRadius) * repelStrength;
            repelX = (dx / distance) * force;
            repelY = (dy / distance) * force;
          }
        }

        const offset = getOrientationOffset(index, ORIENTATION_OFFSET);
        const tx = idleX + repelX;
        const ty = idleY + repelY + offset;

        s.span.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;

        if (timeSinceStart > (index + 1) * charChangeDuration + charChangeDurationBase) {
          s.span.innerText = s.char;
          s.span.style.color = "inherit";
        } else if (timeSinceLastCharChange > charChangeInterval) {
          lastCharChange = now;
          s.span.innerText = alphabet[(currentCharIndex++ + index) % alphabet.length];
          s.span.style.color = `hsl(${colorOffset + Math.random() * 10}, 100%, 35%)`;
        }
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(frameId);
      state.forEach((s) => {
        s.span.style.transform = "";
      });
    };
  }, [orientation]);

  return (
    <div
      ref={containerRef}
      className="font-extrablack relative grid grid-cols-2 gap-16 font-mono text-[12rem] leading-[0.6]"
    >
      {text.split("").map((ch, i) => (
        <div key={i} className="char relative">
          <span className="inline-block">{ch}</span>
        </div>
      ))}
    </div>
  );
}
