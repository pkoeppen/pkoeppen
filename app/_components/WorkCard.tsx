import { faArrowUpRightFromSquare } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";

import "./WorkCard.css";

type WorkCardProps = {
  image: string;
  width: number;
  height: number;
  title: string;
  description: string;
  role: string;
  year: string;
};

export default function WorkCard({
  image,
  width,
  height,
  title,
  description,
  role,
  year,
}: WorkCardProps) {
  return (
    <div className="flex w-xl flex-col gap-8 rounded-3xl border border-zinc-200 bg-white p-10 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <div className="my-4 flex h-38 w-full items-center justify-center">
        <Image
          src={image}
          alt={title}
          width={width}
          height={height}
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="work-card-header">COMPANY INFO</h2>
        <p className="work-card-description">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 border-y border-zinc-200 py-6 dark:border-zinc-800">
        <div className="flex flex-col gap-1">
          <h2 className="work-card-header">ROLE</h2>
          <p className="work-card-description">{role}</p>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="work-card-header">YEAR</h2>
          <p className="work-card-description">{year}</p>
        </div>
      </div>
      <div className="flex gap-6">
        <button className="work-card-button">
          <span className="relative top-px text-[26px]">View Project</span>
        </button>
        <button className="work-card-button">
          <span className="relative top-px text-[26px]">View Site</span>
          <FontAwesomeIcon
            icon={faArrowUpRightFromSquare}
            className="relative -top-px text-[16px]"
          />
        </button>
      </div>
    </div>
  );
}
