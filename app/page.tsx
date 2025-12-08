"use client";

import FloatingText from "./_components/FloatingText";
import Header from "./_components/Header";
import ScrollScene from "./_components/ScrollScene";

export default function Main() {
  return (
    <>
      <Header />
      <ScrollScene />

      <div id="smooth-wrapper">
        <main id="smooth-content" className="relative z-10 flex min-h-screen flex-col items-center">
          <section id="hero" className="relative flex h-screen w-full items-center justify-around">
            <FloatingText text="CREATIVE" orientation="left" />
            <FloatingText text="ENGINEER" orientation="right" />
          </section>

          <section id="about" className="px-grid flex h-screen w-full items-center">
            <div className="w-1/2">
              <h2 className="font-extrablack text-9xl">ABOUT ME</h2>
              <p className="text-xl leading-loose">
                I&apos;m a software engineer with a passion for building things that are both
                functional and beautiful. Lorem ipsum dolor sit amet, consectetur adipiscing elit,
                sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
                veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
                dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident,
                sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </div>
          </section>

          <section id="work" className="px-grid flex h-screen w-full justify-around">
            <div className="w-1/2">
              <h2 className="font-extrablack text-9xl">WORK</h2>
              <p className="text-xl leading-loose">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Quisquam,
                quos. Quisquam, quos. Quisquam, quos. Quisquam, quos. Quisquam, quos. Quisquam,
                quos. Quisquam,
              </p>
            </div>
          </section>

          <section id="skills" className="px-grid flex h-screen w-full justify-around">
            <div className="w-1/2">
              <h2 className="font-extrablack text-9xl">SKILLS</h2>
              <p className="text-xl leading-loose">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Quisquam,
                quos. Quisquam, quos. Quisquam, quos. Quisquam, quos. Quisquam, quos. Quisquam,
                quos. Quisquam,
              </p>
            </div>
          </section>

          <section id="contact" className="px-grid flex h-screen w-full justify-around">
            <div className="w-1/2">
              <h2 className="font-extrablack text-9xl">CONTACT</h2>
              <p className="text-xl leading-loose">
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Quisquam,
                quos. Quisquam, quos. Quisquam, quos. Quisquam, quos. Quisquam, quos. Quisquam,
                quos. Quisquam,
              </p>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
