"use client";

import React from "react";

type RawSection = {
  id: string;
  height: number;
  static: boolean;
};

type NormalizedSection = RawSection & {
  startNorm: number;
  endNorm: number;
};

function normalizeSections(sections: RawSection[], totalHeight: number): NormalizedSection[] {
  let offset = 0;
  return sections.map((s) => {
    const startNorm = offset / totalHeight;
    const endNorm = (offset + s.height) / totalHeight;
    offset += s.height;
    return { ...s, startNorm, endNorm };
  });
}

export default function useSections(selector = "[data-section]") {
  const [sections, setSections] = React.useState<NormalizedSection[]>([]);
  const [ready, setReady] = React.useState(false);
  const [normalizedViewportHeight, setNormalizedViewportHeight] = React.useState(0);

  React.useLayoutEffect(() => {
    // Defer until after the browser has actually painted once
    const rafId = requestAnimationFrame(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));

      if (!nodes.length) {
        setReady(false);
        return;
      }

      const raw: RawSection[] = nodes.map((el) => ({
        id: el.id || el.dataset.id || "",
        height: Number(el.dataset.height ?? 100),
        static: el.dataset.static === "true",
      }));

      const totalHeight = raw.reduce((sum, s) => sum + s.height, 0);
      const normalized = normalizeSections(raw, totalHeight);
      const normalizedViewportHeight = 100 / totalHeight;

      setSections(normalized);
      setNormalizedViewportHeight(normalizedViewportHeight);
      setReady(true);
    });

    return () => cancelAnimationFrame(rafId);
  }, [selector]);

  return { sections, ready, normalizedViewportHeight };
}
