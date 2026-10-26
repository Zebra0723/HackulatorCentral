import { SPONSOR } from "@/config/sponsor";

function SponsorLogo({ className, eager = false }: { className?: string; eager?: boolean }) {
  return (
    <img
      className={className}
      src={SPONSOR.logo}
      width={SPONSOR.logoWidth}
      height={SPONSOR.logoHeight}
      alt={SPONSOR.name}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

const linkProps = { href: SPONSOR.href, target: "_blank", rel: "sponsored noopener noreferrer" } as const;

/** Full-width "Proudly sponsored by NextPCB" band for the page body. */
export function SponsorBand() {
  return (
    <section className="sponsor-band" aria-label={`Sponsored by ${SPONSOR.name}`}>
      <div className="container sponsor-band__inner">
        <span className="sponsor-band__label">Proudly sponsored by</span>
        <a className="sponsor-band__link" {...linkProps}>
          <SponsorLogo className="sponsor-band__logo" />
        </a>
      </div>
    </section>
  );
}

/** "Sponsored by [logo]" chip. `tone` matches the surface it sits on. */
export function Sponsor({ tone = "dark", eager = false }: { tone?: "dark" | "light"; eager?: boolean }) {
  return (
    <div className={`sponsor sponsor--${tone}`}>
      <span className="sponsor__label">Sponsored by</span>
      <a className="sponsor__link" {...linkProps}>
        <SponsorLogo className="sponsor__logo" eager={eager} />
      </a>
    </div>
  );
}
