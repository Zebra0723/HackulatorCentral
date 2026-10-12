/**
 * Clear, visible reminder that on-screen previews are simple web mockups and the
 * finished Hackulator display will look much nicer.
 */
export function MockupNotice({ tone = "light", compact = false }: { tone?: "light" | "dark"; compact?: boolean }) {
  return (
    <div className={`mockup-note mockup-note--${tone}${compact ? " mockup-note--compact" : ""}`} role="note">
      <span className="mockup-note__badge" aria-hidden="true">
        <SparkleIcon /> Mockup
      </span>
      <p className="mockup-note__text">
        <strong>The real screen will look much nicer than this.</strong>{" "}
        {compact
          ? "This is just a simple web mockup of the layout."
          : "This is just a simple web mockup of the layout. The finished Hackulator display will be sharper, smoother and far more polished."}
      </p>
    </div>
  );
}

/** Small corner tag for screen previews. */
export function MockupTag() {
  return (
    <span className="mockup-tag" aria-hidden="true">
      <SparkleIcon /> Simple mockup
    </span>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
      <path d="M8 0l1.7 5.1L15 7l-5.3 1.9L8 14l-1.7-5.1L1 7l5.3-1.9z" />
      <path d="M13.5 10.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z" opacity="0.7" />
    </svg>
  );
}
