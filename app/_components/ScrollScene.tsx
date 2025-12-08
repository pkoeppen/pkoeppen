"use client";

import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import React from "react";
import * as THREE from "three";

import GridBackground from "./GridBackground";
import { PixelField } from "./PixelField";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
gsap.defaults({ ease: "power2.inOut" });

const SNAP_POINTS = [0, 0.25, 0.5, 0.75, 1];

export default function ScrollScene() {
  const progressRef = React.useRef(0);

  React.useLayoutEffect(() => {
    const triggerElement = document.querySelector("#smooth-content");

    if (!triggerElement) return;

    const context = gsap.context(() => {
      ScrollSmoother.create({
        smooth: 1,
        effects: true,
        smoothTouch: 0.1,
        speed: 0.3,
      });
      ScrollTrigger.create({
        trigger: triggerElement,
        start: "top top",
        end: "bottom bottom",
        scrub: false,
        snap: {
          snapTo: SNAP_POINTS,
          duration: 1,
          ease: "power3.inOut",
          inertia: false,
        },
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });
    });

    return () => context.revert();
  });

  return (
    <>
      <div className="fixed inset-0 z-10">
        <Canvas
          gl={{ outputColorSpace: THREE.SRGBColorSpace, toneMapping: THREE.NoToneMapping }}
          orthographic
          camera={{ position: [0, 0, 100], zoom: 12 }}
        >
          <PixelField getProgress={() => progressRef.current} />
        </Canvas>
      </div>
      <GridBackground getProgress={() => progressRef.current} />
    </>
  );
}
