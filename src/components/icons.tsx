import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;

export const PlayIcon = (p: P) => (
  <svg {...base} {...p}><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" /></svg>
);
export const PauseIcon = (p: P) => (
  <svg {...base} {...p}><path d="M8 5v14M16 5v14" strokeWidth={3} /></svg>
);
export const ReplayIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
);
export const SoundOnIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>
);
export const SoundOffIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" /><path d="M17 9.5l5 5M22 9.5l-5 5" /></svg>
);
export const MenuIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 8h16M4 16h16" /></svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const ArrowIcon = ({ dir = "up", ...p }: P & { dir?: "up" | "down" | "left" | "right" }) => {
  const r = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return (
    <svg {...base} {...p} style={{ transform: `rotate(${r}deg)` }}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
  );
};
