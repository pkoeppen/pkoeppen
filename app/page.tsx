"use client";

import { faGithub, faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { faEnvelope } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";

import FloatingText from "./_components/FloatingText";
import Header from "./_components/Header";
import ScrollScene from "./_components/ScrollScene";
import WorkContent from "./_components/WorkContent";

export default function Main() {
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const workSectionRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <>
      <ScrollScene />

      <div id="smooth-wrapper" className="relative z-20">
        <main
          id="smooth-content"
          ref={scrollContainerRef}
          className="relative z-10 flex min-h-screen flex-col items-center"
        >
          <Header />

          <section
            id="hero"
            data-section
            data-height="100"
            data-static="false"
            className="relative flex h-screen w-full items-center justify-evenly pt-24"
          >
            <FloatingText text="CREATIVE" orientation="left" />
            <div className="h-full w-1/3" />
            <FloatingText text="ENGINEER" orientation="right" />
          </section>
          <section
            id="about"
            data-section
            data-height="200"
            data-static="false"
            className="h-[200vh] w-full border-red-500"
          />
          <section
            id="work"
            ref={workSectionRef}
            data-section
            data-height="200"
            data-static="false"
            className="h-[200vh] w-full border-blue-500"
          />
          <section
            id="skills"
            data-section
            data-height="200"
            data-static="false"
            className="flex h-[200vh] w-full border-green-500"
          />
          <section
            id="contact"
            data-section
            data-height="200"
            data-static="true"
            className="flex h-[200vh] w-full border-yellow-500"
          />
        </main>
      </div>

      <div
        id="about-content"
        className="fixed top-1/2 left-20 hidden w-1/2 -translate-y-1/2 flex-col gap-4"
      >
        <h2 className="font-extrablack font-display text-9xl">ABOUT ME</h2>
        <p className="text-xl leading-loose">
          I&apos;m a software engineer with a passion for building things that are both functional
          and beautiful. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
          tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
          dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
          anim id est laborum.
        </p>
        <div className="gap-grid justify-endf flex items-center">
          <div className="grow" />
          <a href="https://github.com/pkoeppen" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon
              icon={faGithub}
              size="2x"
              className="opacity-50 transition-opacity hover:opacity-100"
            />
          </a>
          <a href="https://www.linkedin.com/in/pkoeppen" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon
              icon={faLinkedin}
              size="2x"
              className="opacity-50 transition-opacity hover:opacity-100"
            />
          </a>
          <a href="mailto:pkoeppen@pm.me" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon
              icon={faEnvelope}
              size="2x"
              className="opacity-50 transition-opacity hover:opacity-100"
            />
          </a>
        </div>
      </div>

      <WorkContent scrollContainerRef={scrollContainerRef} sectionRef={workSectionRef} />
    </>
  );
}
