import type { ReactNode } from "react";
import type { CoverIconId } from "@/config/offer";

/** Original vector icons for the cover-icon option, drawn on a 24×24 grid in currentColor. */
const ART: Record<CoverIconId, ReactNode> = {
  dog: (
    <>
      <ellipse cx="5.2" cy="10.6" rx="2.7" ry="5.6" transform="rotate(18 5.2 10.6)" />
      <ellipse cx="18.8" cy="10.6" rx="2.7" ry="5.6" transform="rotate(-18 18.8 10.6)" />
      <ellipse cx="12" cy="12.8" rx="6.6" ry="7.4" />
      <circle cx="9.4" cy="11.2" r="1.1" fill="var(--icon-cut, #fff)" />
      <circle cx="14.6" cy="11.2" r="1.1" fill="var(--icon-cut, #fff)" />
      <ellipse cx="12" cy="15.3" rx="1.9" ry="1.3" fill="var(--icon-cut, #fff)" />
      <path d="M12 16.6v1.4M10.3 18.6c1 .7 2.4.7 3.4 0" fill="none" stroke="var(--icon-cut, #fff)" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  lightning: <path d="M13.6 1.8 4.8 13.4c-.3.4 0 1 .5 1h5.3l-1.6 7.4c-.1.6.6.9 1 .4l8.9-11.7c.3-.4 0-1-.5-1h-5.3l1.5-7.3c.1-.6-.6-.9-1-.4Z" />,
  heart: <path d="M12 20.6s-8.6-5.1-8.6-11.2A4.9 4.9 0 0 1 12 6.3a4.9 4.9 0 0 1 8.6 3.1c0 6.1-8.6 11.2-8.6 11.2Z" />,
  star: <path d="m12 2.4 2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.1l-5.9 3.2 1.3-6.5L2.5 9.2l6.6-.8L12 2.4Z" />,
  "soccer-ball": (
    <>
      <circle cx="12" cy="12" r="9.6" />
      <g fill="var(--icon-cut, #fff)">
        <path d="m12 8.2 3.1 2.2-1.2 3.7h-3.8l-1.2-3.7L12 8.2Z" />
        <path d="M12 3.6c1.1 0 2.1.2 3 .6L12 6.3 9 4.2c.9-.4 1.9-.6 3-.6ZM4.1 9.6l2.8 1.1-.3 3.8-2.2.9a8.4 8.4 0 0 1-.3-5.8ZM19.9 9.6c.6 1.9.5 4-.3 5.8l-2.2-.9-.3-3.8 2.8-1.1ZM8 19.4l.7-2.7 3.3-.2-.1.1 3.4.1.7 2.7a8.4 8.4 0 0 1-8 0Z" />
      </g>
    </>
  ),
  "tennis-ball": (
    <>
      <circle cx="12" cy="12" r="9.6" />
      <g fill="none" stroke="var(--icon-cut, #fff)" strokeWidth="1.6" strokeLinecap="round">
        <path d="M4.3 6.4a9 9 0 0 1 0 11.2" />
        <path d="M19.7 6.4a9 9 0 0 0 0 11.2" />
      </g>
    </>
  ),
  "paw-print": (
    <>
      <ellipse cx="6.1" cy="10.4" rx="2" ry="2.5" transform="rotate(-18 6.1 10.4)" />
      <ellipse cx="9.6" cy="6.2" rx="2.1" ry="2.7" transform="rotate(-6 9.6 6.2)" />
      <ellipse cx="14.4" cy="6.2" rx="2.1" ry="2.7" transform="rotate(6 14.4 6.2)" />
      <ellipse cx="17.9" cy="10.4" rx="2" ry="2.5" transform="rotate(18 17.9 10.4)" />
      <path d="M12 11.6c2.3 0 5.3 3.4 5.3 6 0 1.8-1.4 2.6-3 2.6-1 0-1.6-.5-2.3-.5s-1.3.5-2.3.5c-1.6 0-3-.8-3-2.6 0-2.6 3-6 5.3-6Z" />
    </>
  ),
  smiley: (
    <>
      <circle cx="12" cy="12" r="9.6" />
      <g fill="var(--icon-cut, #fff)">
        <ellipse cx="9" cy="9.8" rx="1.2" ry="1.6" />
        <ellipse cx="15" cy="9.8" rx="1.2" ry="1.6" />
        <path d="M7.4 13.6c.2-.4.6-.6 1-.5 2.4.7 4.8.7 7.2 0 .4-.1.8.1 1 .5.1.3 0 .7-.2.9A6.9 6.9 0 0 1 12 17.4a6.9 6.9 0 0 1-4.4-2.9c-.2-.2-.3-.6-.2-.9Z" />
      </g>
    </>
  ),
};

/**
 * Cut-out details (eyes, seams) use --icon-cut so the icon reads on any background;
 * set it to the surface colour the icon sits on.
 */
export function CoverIcon({ id, className, cut }: { id: CoverIconId; className?: string; cut?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={cut ? ({ ["--icon-cut" as string]: cut } as React.CSSProperties) : undefined}
    >
      {ART[id]}
    </svg>
  );
}
