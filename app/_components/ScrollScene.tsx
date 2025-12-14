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

export default function ScrollScene() {
  const timelineRef = React.useRef<GSAPTimeline>(null);
  const progressRef = React.useRef(0);
  const getProgress = React.useCallback(() => progressRef.current, []);

  React.useLayoutEffect(() => {
    const triggerElement = document.querySelector<HTMLElement>("#smooth-content");
    if (!triggerElement) return;

    const timeline = gsap.timeline({
      paused: true,
      scrollTrigger: {
        trigger: triggerElement,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });

    timeline.to({}, { duration: 1 }, 0);

    ScrollTrigger.create({
      trigger: triggerElement,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: function (self) {
        progressRef.current = self.progress;
        timeline.progress(self.progress);
      },
    });

    timelineRef.current = timeline;

    const context = gsap.context(() => {
      ScrollSmoother.create({
        smooth: 1,
        effects: true,
        smoothTouch: 0.1,
        speed: 0.3,
      });

      const aboutSection = document.querySelector<HTMLElement>("#about");
      const aboutContent = document.querySelector<HTMLElement>("#about-content");

      if (!aboutSection || !aboutContent) return;

      const duration = 0.3;

      const showAbout = () => {
        gsap.set(aboutContent, {
          display: "flex",
          zIndex: 30,
        });
        gsap.to(aboutContent, {
          opacity: 1,
          duration,
          ease: "power2.out",
        });
      };

      const hideAbout = () => {
        gsap.to(aboutContent, {
          opacity: 0,
          duration,
          ease: "power2.in",
          onComplete: () => {
            gsap.set(aboutContent, {
              display: "none",
              zIndex: "auto",
            });
          },
        });
      };

      // Initial state
      gsap.set(aboutContent, { opacity: 0, display: "none" });

      ScrollTrigger.create({
        trigger: aboutSection,
        start: "top top",
        end: "50% 50%",
        scrub: false,
        onEnter: showAbout,
        onEnterBack: showAbout,
        onLeave: hideAbout,
        onLeaveBack: hideAbout,
      });

      const workSection = document.querySelector<HTMLElement>("#work");
      const workContent = document.querySelector<HTMLElement>("#work-content");

      if (!workSection || !workContent) return;

      const showWork = () => {
        gsap.set(workContent, {
          display: "flex",
          zIndex: 30,
        });
        gsap.to(workContent, {
          opacity: 1,
          duration,
          ease: "power2.out",
        });
      };

      const hideWork = () => {
        gsap.to(workContent, {
          opacity: 0,
          duration,
          ease: "power2.in",
          onComplete: () => {
            gsap.set(workContent, {
              display: "none",
              zIndex: "auto",
            });
          },
        });
      };

      // Initial state
      gsap.set(workContent, { opacity: 0, display: "none" });

      ScrollTrigger.create({
        trigger: workSection,
        start: "top top",
        end: "bottom 80%",
        scrub: false,
        onEnter: showWork,
        onEnterBack: showWork,
        onLeave: hideWork,
        onLeaveBack: hideWork,
      });
    });

    return () => {
      context.revert();
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-10">
        <Canvas
          gl={{
            outputColorSpace: THREE.SRGBColorSpace,
            toneMapping: THREE.NoToneMapping,
          }}
          orthographic
          camera={{ position: [0, 0, 100], zoom: 12 }}
        >
          <PixelField timelineRef={timelineRef} getProgress={getProgress} />
        </Canvas>
      </div>
      <GridBackground getProgress={getProgress} />
    </>
  );
}
