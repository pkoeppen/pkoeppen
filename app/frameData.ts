import frameDataJSON from "../tools/image2pixels/output/frame_data.json";

export interface FrameData {
  width: number;
  height: number;
  channels: number;
  frames: Uint8ClampedArray[][];
}

export const frameData: FrameData = frameDataJSON as unknown as FrameData;

export interface Keyframe {
  frameStart: number;
  frameEnd: number;
  progressStart: number;
  progressEnd: number;
}

export const keyframes: readonly Keyframe[] = [
  {
    frameStart: 0,
    frameEnd: 14,
    progressStart: 0,
    progressEnd: 0.25,
  },
  {
    frameStart: 14,
    frameEnd: 43,
    progressStart: 0.25,
    progressEnd: 0.5,
  },
  {
    frameStart: 43,
    frameEnd: 66,
    progressStart: 0.75,
    progressEnd: 1,
  },
] as const;
