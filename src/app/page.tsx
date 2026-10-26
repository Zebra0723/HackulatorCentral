import { COVER_COLOURS, COVER_ICONS, PRICES, formatPence, isGameBuyable, isPackBuyable } from "@/config/offer";
import { siteConfig } from "@/config/site";
import { Compare } from "@/components/Compare";
import { Configurator } from "@/components/Configurator";
import { Faq } from "@/components/Faq";
import { FilmStage } from "@/components/FilmStage";
import { Logo } from "@/components/Logo";
import { NAV_LINKS } from "@/components/nav";
import { SiteHeader } from "@/components/SiteHeader";
import { Sponsor, SponsorBand } from "@/components/Sponsor";
import { DeviceFront } from "@/components/device/DeviceFront";
import { InteractiveHackulator } from "@/components/device/InteractiveHackulator";
import { StaticLauncher } from "@/components/device/StaticLauncher";
import { FillText, Marquee, ScrollFx } from "@/components/scroll/ScrollFx";
import { MockupTag } from "@/components/MockupNotice";
import { MailingSignup } from "@/components/MailingSignup";
import { Waitlist } from "@/components/Waitlist";
import { loadCatalogue } from "@/lib/server/catalogue";
import { dbMode, getDb } from "@/lib/server/db";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/server/settings";
import { waitlistSummary, type WaitlistSummary } from "@/lib/server/waitlist";

const INSIDE = [
  {
    title: "Familiar keys",
    body: "The recognisable calculator shape and its physical keys stay. Your hands already know the layout.",
  },
  {
    title: "Replacement electronics",
    body: "The original board comes out. A custom board designed for the Hackulator goes in its place.",
  },
  {
    title: "Colour display",
    body: "A colour screen replaces the original display, giving games and menus room to breathe.",
  },
  {
    title: "Custom software",
    body: "A purpose-built interface for launching games, changing settings and, if you choose, a personalised look.",
  },
];

const INSIDE_TONES = ["night", "lime", "paper", "ink"] as const;

function Chapter({ n, label }: { n: string; label: string }) {
  return (
    <p className="chapter" data-reveal>
      <span className="chapter__num">{n}</span>
      <span className="chapter__label">{label}</span>
    </p>
  );
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const { conceptFilm, contact } = siteConfig;
  const { catalogue } = await loadCatalogue();
  const packs = [...catalogue.packs].sort((a, b) => a.sort - b.sort);
  const singlePrices = Array.from(new Set(catalogue.games.filter(isGameBuyable).map((g) => g.pricePence!)));
  // Owner-editable settings and waitlist counts. If the database is unreachable the page still renders with defaults.
  let settings = { ...DEFAULT_SETTINGS };
  let wl: WaitlistSummary = { spots: settings.waitlistSpots, taken: 0, left: settings.waitlistSpots, open: settings.waitlistOpen };
  let dbReady = false;
  try {
    const db = await getDb();
    if (db) {
      settings = await getSettings(db);
      wl = await waitlistSummary(db);
      dbReady = true;
    }
  } catch (e) {
    console.error("Settings unavailable; using defaults.", e);
  }
  const onlineSubmissions = dbMode() !== "none" && dbReady && settings.enquiriesOpen;
  const basePrice = settings.basePricePence == null ? null : formatPence(settings.basePricePence);
  const baseGames = catalogue.games.filter((g) => g.base).map((g) => g.name);
  const stats = [
    { value: String(baseGames.length), label: "games included", sub: baseGames.join(", ") },
    { value: String(COVER_COLOURS.length), label: "cover colours", sub: "for your name and icon" },
    { value: String(COVER_ICONS.length), label: "cover icons", sub: "crisp vector art" },
    { value: formatPence(PRICES.customUi).replace(/\.00$/, ""), label: "Custom UI", sub: "fonts, colours, layout" },
  ];

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {settings.announcementOn && settings.announcementText && (
        <div className="announce" role="status">
          <span className="announce__dot" aria-hidden="true" />
          {settings.announcementText}
        </div>
      )}
      <SiteHeader />
      <ScrollFx />

      <main id="main">
        {/* Hero */}
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero__bg" aria-hidden="true">
            <span className="hero__blob hero__blob--a" />
            <span className="hero__blob hero__blob--b" />
          </div>
          <div className="container hero__grid">
            <div className="hero__copy">
              <div className="hero__pills">
                <span className="status-pill">
                  <span className="status-pill__dot" aria-hidden="true" />
                  {settings.statusLabel}
                </span>
                {wl.open && wl.left > 0 && (
                  <a className="hero__wl" href="#waitlist">
                    {wl.left} of {wl.spots} waitlist spots left · Join free
                  </a>
                )}
              </div>
              <Logo priority className="hero__logo" alt="Hackulator" />
              <h1 className="display hero__title" id="hero-title">
                <span className="hero__line">A calculator.</span>{" "}
                <span className="hero__line hero__line--mark">Reimagined.</span>
              </h1>
              <p className="lede">
                New electronics, a colour display and games, built into the scientific calculator you already know.
              </p>
              <div className="hero__actions">
                <a className="btn btn-primary" href="#build">
                  Build your Hackulator
                </a>
                <a className="btn btn-secondary" href="#film">
                  Watch the concept
                </a>
              </div>
              <p className="hero__note small muted">
                An independent project. Not affiliated with or endorsed by Casio. Nothing is for sale yet.
              </p>
            </div>
            <div id="film" className="hero__film">
              <FilmStage
                src={conceptFilm.src}
                poster={conceptFilm.poster}
                posterFallback={conceptFilm.posterFallback}
                width={conceptFilm.width}
                height={conceptFilm.height}
                durationLabel={conceptFilm.durationLabel}
              />
            </div>
          </div>
          <a className="scroll-cue" href="#overview">
            <span>Scroll</span>
            <span className="scroll-cue__line" aria-hidden="true" />
          </a>
        </section>

        <Marquee
          items={["Snake", "2048", "Tetris", "Colour display", "Same familiar keys", "Custom UI", "Your name on the cover", `Only ${wl.spots} waitlist spots`]}
        />

        <SponsorBand />

        {/* Overview */}
        <section className="section section--alt" id="overview" aria-labelledby="overview-title">
          <div className="container overview__grid">
            <div className="overview__visual" data-reveal>
              <MockupTag />
              <div className="overview__device">
                <DeviceFront screen={<StaticLauncher />} alt="The Hackulator: a familiar Casio scientific calculator with a colour display showing the games launcher" />
              </div>
            </div>
            <div data-reveal>
              <Chapter n="01" label="Overview" />
              <h2 className="h2" id="overview-title">
                Same shape. Entirely new inside.
              </h2>
              <p className="lede">
                Hackulator takes an ordinary Casio scientific calculator, keeps its body and keys, and replaces the electronics
                with a custom board and colour display, so the calculator in your bag can also play games.
              </p>
              <ul className="fact-list">
                <li>
                  <span className="fact-k">Status</span>
                  <span>Prototype in development. Not yet available to buy.</span>
                </li>
                <li>
                  <span className="fact-k">Based on</span>
                  <span>An ordinary Casio scientific calculator: same body, same keys</span>
                </li>
                <li>
                  <span className="fact-k">Included games</span>
                  <span>Snake, 2048 and Tetris</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Statement */}
        <section className="statement" aria-label="The idea">
          <div className="container">
            <FillText
              className="statement__text"
              text="Keep the keys your hands already know. Rebuild everything behind them around a colour screen."
            />
          </div>
        </section>

        {/* Numbers (all taken from the live options) */}
        <section className="stats" aria-label="Options at a glance">
          <div className="container stats__grid">
            {stats.map((st, i) => (
              <div className={`stat stat--${i}`} key={st.label} data-reveal style={{ ["--d" as string]: `${i * 80}ms` }}>
                <span className="stat__value">{st.value}</span>
                <span className="stat__label">{st.label}</span>
                <span className="stat__sub">{st.sub}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Inside */}
        <section className="section dark" id="inside" aria-labelledby="inside-title">
          <div className="container">
            <div className="section-head section-head--split" data-reveal>
              <div>
                <Chapter n="02" label="Inside" />
                <h2 className="h2" id="inside-title">
                  Four ideas, one calculator.
                </h2>
              </div>
              <p className="lede">
                The concept is simple. Keep what works about the calculator and rebuild the rest around a colour screen.
              </p>
            </div>
            <div className="stack">
              {INSIDE.map((item, i) => (
                <article
                  className={`stack-card stack-card--${INSIDE_TONES[i]}`}
                  key={item.title}
                  style={{ ["--i" as string]: i }}
                >
                  <span className="stack-card__num" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <div className="stack-card__body">
                    <h3 className="stack-card__title">{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="status-panel" data-reveal>
              <div>
                <h3 className="h3">Where the engineering stands</h3>
                <p className="muted" style={{ margin: 0 }}>
                  This is a prototype, so we&apos;re not quoting a final specification. These are the open questions
                  as they are today.
                </p>
              </div>
              <ul className="status-list">
                <li>
                  <span className="tag tag--target">Target</span>
                  <span>An RP2040-class microcontroller with 8 MB of flash is the current design target, not a final spec.</span>
                </li>
                <li>
                  <span className="tag tag--open">Open</span>
                  <span>Sourcing a colour display that fits the original housing.</span>
                </li>
                <li>
                  <span className="tag tag--open">Open</span>
                  <span>Confirming it can run on a single AAA battery.</span>
                </li>
                <li>
                  <span className="tag tag--open">Open</span>
                  <span>Final manufacturing and assembly.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Games */}
        <section className="section" id="games" aria-labelledby="games-title">
          <div className="container">
            <div className="section-head section-head--split" data-reveal>
              <div>
                <Chapter n="03" label="Games" />
                <h2 className="h2" id="games-title">
                  Try it. It&apos;s a calculator first.
                </h2>
              </div>
              <p className="lede">
                Every Hackulator comes with Snake, 2048 and Tetris. Use the calculator below for a sum, then press{" "}
                <strong>Discover what&apos;s inside</strong> to open the games.
              </p>
            </div>

            <div data-reveal>
              <InteractiveHackulator />
            </div>

            <div className="extras-list">
              {packs.map((p) => (
                <div className="pack-card" key={p.id} data-reveal>
                  <div className="pack-card__head">
                    <h3 className="h3">{p.name}</h3>
                    {isPackBuyable(p) ? <strong>{formatPence(p.pricePence)}</strong> : <span className="tag">Planned</span>}
                  </div>
                  <ul>
                    {p.gameIds.map((id) => (
                      <li key={id}>{catalogue.games.find((g) => g.id === id)?.name ?? id}</li>
                    ))}
                    {Array.from({ length: p.tbaTitles }).map((_, i) => (
                      <li key={`tba-${i}`} className="tba">
                        {p.tbaTitles === 1 ? "Third game" : "Game"} to be announced
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {singlePrices.length > 0 && (
              <p className="small muted" style={{ marginTop: 20 }}>
                Single compatible games are {singlePrices.map(formatPence).join(" or ")} each.
              </p>
            )}
          </div>
        </section>

        {/* Build yours */}
        <section className="section section--alt" id="build" aria-labelledby="build-title">
          <div className="container">
            <div className="section-head section-head--split" data-reveal>
              <div>
                <Chapter n="04" label="Build Yours" />
                <h2 className="h2" id="build-title">
                  Make it yours.
                </h2>
              </div>
              <p className="lede">
                Choose software and cover options to see the extras subtotal. The base price will be added once
                it&apos;s announced.
              </p>
            </div>
            <Configurator catalogue={catalogue} onlineSubmissions={onlineSubmissions} email={contact.email} basePrice={basePrice} />
          </div>
        </section>

        {/* Waitlist */}
        <section className="section waitlist-section" id="waitlist" aria-labelledby="waitlist-title">
          <div className="waitlist-section__glow" aria-hidden="true" />
          <div className="container">
            <Chapter n="05" label="Waitlist" />
            <div data-reveal>
              <Waitlist spots={wl.spots} taken={wl.taken} open={wl.open} available={dbReady} email={contact.email} />
            </div>
          </div>
        </section>

        {/* Lifetime options */}
        <section className="section section--tight" id="lifetime" aria-labelledby="lifetime-title">
          <div className="container">
            <div className="section-head" data-reveal>
              <Chapter n="06" label="Lifetime options" />
              <h2 className="h2" id="lifetime-title">
                Pay once. Plainly.
              </h2>
              <p className="lede">
                No renewals and no hidden installation fees for anything a pass covers. All prices are extras on top of
                the base price.
              </p>
            </div>
            <Compare />
          </div>
        </section>

        {/* FAQ */}
        <section className="section section--alt" id="faq" aria-labelledby="faq-title">
          <div className="container">
            <div className="section-head" data-reveal>
              <Chapter n="07" label="FAQ" />
              <h2 className="h2" id="faq-title">
                Questions, answered.
              </h2>
            </div>
            <Faq />
          </div>
        </section>

        {/* Enquire */}
        <section className="section dark" id="enquire" aria-labelledby="enquire-title">
          <div className="container enquire">
            <div data-reveal>
              <Chapter n="08" label="Enquiries" />
              <h2 className="h2" id="enquire-title">
                Follow the build.
              </h2>
              <p className="lede">
                {contact.email
                  ? "Save your build summary and send it to us. We'll reply when we can."
                  : "Enquiries open once contact details, pricing and fulfilment terms are published. Until then, you can still put a build together and save the summary."}
              </p>
              <div className="hero__actions">
                <a className="btn btn-primary" href="#build">
                  Build your Hackulator
                </a>
                {contact.email && (
                  <a className="btn btn-secondary" href={`mailto:${contact.email}`}>
                    Email {contact.email}
                  </a>
                )}
              </div>
            </div>
            <div className="enquire__card" data-reveal>
              <h3 className="h3">Project status</h3>
              <ul className="kv">
                <li>
                  <span>Stage</span>
                  <span>{settings.stageText}</span>
                </li>
                <li>
                  <span>Base price</span>
                  <span>{basePrice ?? "To be confirmed"}</span>
                </li>
                <li>
                  <span>Availability</span>
                  <span>{settings.availabilityText || "Not yet available"}</span>
                </li>
                <li>
                  <span>Fulfilment terms</span>
                  <span>{settings.fulfilmentText || "To be published"}</span>
                </li>
                <li>
                  <span>Enquiries</span>
                  <span>{contact.email ? "Open" : "Not yet open"}</span>
                </li>
                <li>
                  <span>Waitlist</span>
                  <span>{wl.open ? `${wl.left} of ${wl.spots} spots left` : "Closed"}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Weekly email */}
        <section className="drop" id="drop" aria-labelledby="drop-title">
          <div className="container drop__inner" data-reveal>
            <div className="drop__copy">
              <p className="drop__kicker">The Weekly Drop</p>
              <h2 className="drop__title" id="drop-title">
                Follow the build, <span className="drop__hl">every week.</span>
              </h2>
              <p className="drop__lede">
                One short email a week: what changed on the bench, sneak peeks and how many waitlist spots are left. Free,
                no spam, unsubscribe in one click.
              </p>
            </div>
            <MailingSignup available={dbReady} />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="site-footer__top">
            <Logo variant="dark" alt="Hackulator" />
            <nav aria-label="Footer">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
          <Sponsor />
          <div className="site-footer__legal">
            <p>
              Hackulator is an independent prototype project{contact.businessName ? ` by ${contact.businessName}` : ""}.
              It is not affiliated with, endorsed by or sponsored by Casio Computer Co., Ltd. Casio is a trademark of its
              owner and is used only to describe the calculator the Hackulator is built from.
            </p>
            <p>
              The concept film, previews and web demo show a device in development, not a finished product. The web demo
              games are original code written for this site. Game names marked &ldquo;-style&rdquo; are original works
              inspired by genres. Tetris, Flappy Bird, Block Blast and Space Invaders are trademarks of their respective owners, who
              are not affiliated with Hackulator.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
