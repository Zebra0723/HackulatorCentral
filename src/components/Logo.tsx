/** Supplied HACKULATOR logo. Aspect ratio 1041 × 575 is preserved; never stretch. */
export const LOGO_W = 1041;
export const LOGO_H = 575;

export function Logo({
  variant = "light",
  className,
  priority = false,
  alt = "Hackulator",
}: {
  /** light: for warm-white surfaces. dark: for black surfaces. */
  variant?: "light" | "dark";
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const name = variant === "light" ? "hackulator-logo-light" : "hackulator-logo-dark";
  return (
    <picture>
      <source srcSet={`/brand/${name}.webp`} type="image/webp" />
      <img
        src={`/brand/${name}.png`}
        width={LOGO_W}
        height={LOGO_H}
        alt={alt}
        className={className}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
      />
    </picture>
  );
}
