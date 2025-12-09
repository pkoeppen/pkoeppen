"use client";

import { create } from "zustand";

type ScrollStore = {
  progress: number;
  setProgress: (progress: number) => void;
};

export const useScrollStore = create<ScrollStore>((set) => ({
  progress: 0,
  setProgress: (progress: number) => set({ progress }),
}));
