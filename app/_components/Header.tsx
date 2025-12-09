import Link from "next/link";

import PeterKoeppen from "./PeterKoeppen";

export default function Header() {
  return (
    <header className="px-grid pt-grid absolute top-0 z-40 flex w-full justify-between">
      <div className="flex h-[80px] items-center gap-4">
        <PeterKoeppen className="fill-foreground dark:fill-foreground-dark h-full" />
      </div>
      <nav className="h-grid font-display absolute left-1/2 flex -translate-x-1/2 transform items-center justify-center gap-16 pt-[2px] text-2xl font-bold uppercase">
        <Link href="#about">About</Link>
        <Link href="#work">Work</Link>
        <Link href="#skills">Skills</Link>
        <Link href="#contact">Contact</Link>
      </nav>
      <div className="flex items-center justify-end">
        <button className="h-16 w-16 rounded-full bg-zinc-800 text-white">
          <span className="text-2xl">Menu</span>
        </button>
      </div>
    </header>
  );
}
