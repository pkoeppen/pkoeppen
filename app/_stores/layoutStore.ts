"use client";

import { create } from "zustand";

type LayoutStore = {
  hoveredElementBoundingRect: DOMRect | null;
  setHoveredElementBoundingRect: (hoveredElementBoundingRect: DOMRect | null) => void;
  hoveredElementStart: number | null;
  setHoveredElementStart: (hoveredElementStart: number | null) => void;
};

export const useLayoutStore = create<LayoutStore>((set) => ({
  hoveredElementBoundingRect: null,
  setHoveredElementBoundingRect: (hoveredElementBoundingRect: DOMRect | null) =>
    set({ hoveredElementBoundingRect }),
  hoveredElementStart: null,
  setHoveredElementStart: (hoveredElementStart: number | null) => set({ hoveredElementStart }),
}));
