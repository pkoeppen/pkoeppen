import { motion, useScroll, useTransform } from "motion/react";
import React from "react";

import WorkCard from "./WorkCard";

const cards = [
  {
    image: "/images/2k-games.png",
    width: 960,
    height: 764,
    title: "2K Games",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    role: "Software Engineer",
    year: "2020 - 2025",
  },
  {
    image: "/images/lenovo.png",
    width: 1000,
    height: 210,
    title: "Lenovo",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    role: "Software Engineer",
    year: "2020 - 2025",
  },
].map((props, index) => <WorkCard key={index} {...props} />);

export default function WorkContent({
  scrollContainerRef,
  sectionRef,
}: {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  sectionRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const rotation = useTransform(scrollYProgress, [0, 1], [0, -360]);
  const radius = 180;
  const count = cards.length;

  return (
    <div id="work-content" className="fixed inset-0 flex items-center justify-center">
      <motion.div style={{ rotate: rotation }} className="relative h-[400px] w-[400px]">
        {cards.map((card, index) => {
          const angle = (index / count) * 360; // degrees

          return (
            <div
              key={index}
              className="absolute top-1/2 left-1/2"
              style={{
                transform: `
                    rotate(${angle}deg)
                    translate(${radius}px)
                    rotate(${-angle}deg)
                  `,
                transformOrigin: "center center",
              }}
            >
              {card}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
