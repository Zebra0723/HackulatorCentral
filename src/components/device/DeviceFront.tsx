/* eslint-disable @next/next/no-img-element -- fixed-size product photo with exact overlay geometry */
import type { ReactNode } from "react";
import { PHOTO, SCREEN_RECT, pct } from "./keymap";

/**
 * The real calculator front with a slot exactly covering the display opening.
 * `screen` is clipped to that opening; `overlay` sits over the whole photo
 * (used for the clickable keys).
 */
export function DeviceFront({
  screen,
  overlay,
  className,
  alt = "Front of the Hackulator: a familiar scientific calculator with a colour display",
  priority = false,
}: {
  screen: ReactNode;
  overlay?: ReactNode;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  return (
    <div className={`device ${className ?? ""}`} style={{ aspectRatio: `${PHOTO.w} / ${PHOTO.h}` }}>
      <img
        src={PHOTO.src}
        width={PHOTO.w}
        height={PHOTO.h}
        alt={alt}
        className="device__photo"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
      />
      <div
        className="device__screen"
        style={{
          left: pct(SCREEN_RECT.x, PHOTO.w),
          top: pct(SCREEN_RECT.y, PHOTO.h),
          width: pct(SCREEN_RECT.w, PHOTO.w),
          height: pct(SCREEN_RECT.h, PHOTO.h),
        }}
      >
        {screen}
      </div>
      {overlay}
    </div>
  );
}
