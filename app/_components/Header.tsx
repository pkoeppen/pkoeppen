import classNames from "classnames";
import Link from "next/link";
import React from "react";

import { useLayoutStore } from "../_stores/layoutStore";
import "./Header.css";
import PeterKoeppen from "./PeterKoeppen";

export default function Header() {
  return (
    <header className="px-grid pt-grid absolute top-0 z-40 flex w-full justify-between">
      <div className="flex h-[80px] items-center gap-4">
        <PeterKoeppen className="fill-foreground dark:fill-foreground-dark h-full" />
      </div>
      <nav className="h-grid font-display absolute left-1/2 flex -translate-x-1/2 transform items-stretch justify-center gap-16">
        <HeaderButton href="#about" rotate="ccw">
          About
        </HeaderButton>
        <HeaderButton href="#work" rotate="cw">
          Work
        </HeaderButton>
        <HeaderButton href="#skills" rotate="ccw">
          Skills
        </HeaderButton>
        <HeaderButton href="#contact" rotate="cw">
          Contact
        </HeaderButton>
      </nav>
      <div className="flex items-center justify-end">
        <button className="h-16 w-16 rounded-full bg-zinc-800 text-white">
          <span className="text-2xl">Menu</span>
        </button>
      </div>
    </header>
  );
}

function HeaderButton({
  href,
  children,
  rotate = "ccw",
}: {
  href: string;
  children: React.ReactNode;
  rotate?: "ccw" | "cw";
}) {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const { setHoveredElementBoundingRect, setHoveredElementStart } = useLayoutStore.getState();

  return (
    <Link href={href}>
      <button
        ref={buttonRef}
        className="header-button group"
        onMouseEnter={() => {
          setHoveredElementBoundingRect(buttonRef.current?.getBoundingClientRect() ?? null);
          setHoveredElementStart(performance.now());
        }}
        onMouseLeave={() => {
          setHoveredElementBoundingRect(null);
          setHoveredElementStart(null);
        }}
      >
        <div
          className={classNames(
            "transition-transform duration-200 group-hover:scale-115",
            //rotate === "cw" ? "group-hover:rotate-5" : "group-hover:-rotate-5",
          )}
        >
          {children}
        </div>
      </button>
    </Link>
  );
}
