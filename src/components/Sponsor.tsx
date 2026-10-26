import { existsSync } from "node:fs";
import path from "node:path";

const SPONSOR = {
  name: "NextPCB",
  href: "https://www.nextpcb.com/",
  /** Drop the supplied logo into public/brand/ under one of these names. */
  logoFiles: ["nextpcb-logo.svg", "nextpcb-logo.png", "nextpcb-logo.webp"],
};

function findLogo(): string | null {
  const dir = path.join(process.cwd(), "public", "brand");
  const file = SPONSOR.logoFiles.find((f) => existsSync(path.join(dir, f)));
  return file ? `/brand/${file}` : null;
}

/** "Sponsored by NextPCB" badge. Falls back to the name in text until the logo file is added. */
export function Sponsor() {
  const logo = findLogo();
  return (
    <div className="sponsor">
      <span className="sponsor__label">Sponsored by</span>
      <a className="sponsor__link" href={SPONSOR.href} target="_blank" rel="sponsored noopener noreferrer">
        {logo ? (
          <img className="sponsor__logo" src={logo} alt={SPONSOR.name} loading="lazy" decoding="async" />
        ) : (
          <span className="sponsor__name">{SPONSOR.name}</span>
        )}
      </a>
    </div>
  );
}
