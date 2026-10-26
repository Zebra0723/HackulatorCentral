import { existsSync } from "node:fs";
import path from "node:path";

const SPONSOR = {
  name: "NextPCB",
  href: "https://www.nextpcb.com/",
  /** The supplied logo lives in public/brand/ under the first of these names that exists. */
  logoFiles: ["nextpcb-logo.svg", "nextpcb-logo.png", "nextpcb-logo.webp"],
};

function findLogo(): string | null {
  const dir = path.join(process.cwd(), "public", "brand");
  const file = SPONSOR.logoFiles.find((f) => existsSync(path.join(dir, f)));
  return file ? `/brand/${file}` : null;
}

function SponsorMark({ logo }: { logo: string | null }) {
  return logo ? (
    <img className="sponsor__logo" src={logo} alt={SPONSOR.name} loading="lazy" decoding="async" />
  ) : (
    <span className="sponsor__name">{SPONSOR.name}</span>
  );
}

/** Full-width "Proudly sponsored by NextPCB" band for the page body. */
export function SponsorBand() {
  const logo = findLogo();
  return (
    <section className="sponsor-band" aria-label={`Sponsored by ${SPONSOR.name}`}>
      <div className="container sponsor-band__inner">
        <span className="sponsor-band__label">Proudly sponsored by</span>
        <a className="sponsor-band__link" href={SPONSOR.href} target="_blank" rel="sponsored noopener noreferrer">
          <SponsorMark logo={logo} />
        </a>
      </div>
    </section>
  );
}

/** Compact "Sponsored by NextPCB" badge for the footer. */
export function Sponsor() {
  const logo = findLogo();
  return (
    <div className="sponsor">
      <span className="sponsor__label">Sponsored by</span>
      <a className="sponsor__link" href={SPONSOR.href} target="_blank" rel="sponsored noopener noreferrer">
        <SponsorMark logo={logo} />
      </a>
    </div>
  );
}
