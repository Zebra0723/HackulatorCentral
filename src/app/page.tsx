import { PACKS, PRICES, formatPence } from "@/config/offer";
import { siteConfig } from "@/config/site";
import { CalculatorIllustration } from "@/components/CalculatorIllustration";
import { Compare } from "@/components/Compare";
import { Configurator } from "@/components/Configurator";
import { Faq } from "@/components/Faq";
import { FilmStage } from "@/components/FilmStage";
import { Preview2048, PreviewBlocks } from "@/components/GamePreviews";
import { Logo } from "@/components/Logo";
import { NAV_LINKS } from "@/components/nav";
import { SiteHeader } from "@/components/SiteHeader";
import { SnakeDemo } from "@/components/SnakeDemo";

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

export default function Home() {
  const { conceptFilm, contact, availability, fulfilmentTerms } = siteConfig;
  const classics = PACKS.find((p) => p.id === "classics")!;
  const arcade = PACKS.find((p) => p.id === "arcade")!;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />

      <main id="main">
        {/* Hero */}
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="container hero__grid">
            <div>
              <span className="status-pill">
                <span className="status-pill__dot" aria-hidden="true" />
                In development · prototype project
              </span>
              <Logo priority className="hero__logo" alt="Hackulator" />
              <h1 className="display hero__title" id="hero-title">
                A calculator. Reimagined.
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
            <div id="film">
              <FilmStage
                src={conceptFilm.src}
                poster={conceptFilm.poster}
                posterFallback={conceptFilm.posterFallback}
              />
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="section section--alt" id="overview" aria-labelledby="overview-title">
          <div className="container overview__grid">
            <div className="overview__visual">
              <CalculatorIllustration />
            </div>
            <div>
              <p className="eyebrow">Overview</p>
              <h2 className="h2" id="overview-title">
                Same shape. Entirely new inside.
              </h2>
              <p className="lede">
                Hackulator takes a Casio fx-83GT CW+ 2nd Edition, keeps its body and keys, and replaces the electronics
                with a custom board and colour display, so the calculator in your bag can also play games.
              </p>
              <ul className="fact-list">
                <li>
                  <span className="fact-k">Status</span>
                  <span>Prototype in development. Not yet available to buy.</span>
                </li>
                <li>
                  <span className="fact-k">Based on</span>
                  <span>Casio fx-83GT CW+ 2nd Edition body and keys</span>
                </li>
                <li>
                  <span className="fact-k">Included games</span>
                  <span>Snake, 2048 and Blocks</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Inside */}
        <section className="section dark" id="inside" aria-labelledby="inside-title">
          <div className="container">
            <div className="section-head section-head--split">
              <div>
                <p className="eyebrow">Inside</p>
                <h2 className="h2" id="inside-title">
                  Four ideas, one calculator.
                </h2>
              </div>
              <p className="lede">
                The concept is simple. Keep what works about the calculator and rebuild the rest around a colour screen.
              </p>
            </div>
            <div className="inside-grid">
              {INSIDE.map((item, i) => (
                <article className="inside-card" key={item.title}>
                  <span className="inside-card__num">0{i + 1}</span>
                  <h3 className="h3">{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
            <div className="status-panel">
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
            <div className="section-head section-head--split">
              <div>
                <p className="eyebrow">Games</p>
                <h2 className="h2" id="games-title">
                  Three games built in.
                </h2>
              </div>
              <p className="lede">
                Every Hackulator comes with Snake, 2048 and Blocks. The screens below are concept previews, and Snake
                is a small web demo you can play right here.
              </p>
            </div>

            <div className="games-grid">
              <article className="game-card">
                <div className="game-card__screen dark-surface">
                  <SnakeDemo />
                </div>
                <div className="game-card__meta">
                  <h3 className="h3">Snake</h3>
                  <span className="tag">Web demo</span>
                </div>
                <p className="muted small">
                  Runs in your browser. It shows the idea, not how fast the hardware runs.
                </p>
              </article>
              <article className="game-card">
                <div className="game-card__screen">
                  <Preview2048 />
                </div>
                <div className="game-card__meta">
                  <h3 className="h3">2048</h3>
                  <span className="tag">Concept preview</span>
                </div>
                <p className="muted small">Slide and merge tiles towards 2048.</p>
              </article>
              <article className="game-card">
                <div className="game-card__screen">
                  <PreviewBlocks />
                </div>
                <div className="game-card__meta">
                  <h3 className="h3">Blocks</h3>
                  <span className="tag">Concept preview</span>
                </div>
                <p className="muted small">A Tetris-style falling-block puzzle.</p>
              </article>
            </div>

            <div className="extras-list">
              <div className="pack-card">
                <div className="pack-card__head">
                  <h3 className="h3">{classics.name}</h3>
                  <strong>{formatPence(classics.price)}</strong>
                </div>
                <ul>
                  <li>Flappy-style game</li>
                  <li>Pong</li>
                  <li>Google-Dino-style runner</li>
                </ul>
              </div>
              <div className="pack-card">
                <div className="pack-card__head">
                  <h3 className="h3">{arcade.name}</h3>
                  <span className="tag">Not yet available</span>
                </div>
                <ul>
                  <li>Block-Blast-style puzzle</li>
                  <li>Space-Invaders-style shooter</li>
                  <li className="tba">Third game to be announced</li>
                </ul>
              </div>
            </div>
            <p className="small muted" style={{ marginTop: 20 }}>
              Single compatible games are {formatPence(PRICES.singleGame)} each. Titles described as
              &ldquo;-style&rdquo; are original games inspired by a genre, not official versions.
            </p>
          </div>
        </section>

        {/* Build yours */}
        <section className="section section--alt" id="build" aria-labelledby="build-title">
          <div className="container">
            <div className="section-head section-head--split">
              <div>
                <p className="eyebrow">Build Yours</p>
                <h2 className="h2" id="build-title">
                  Make it yours.
                </h2>
              </div>
              <p className="lede">
                Choose software and cover options to see the extras subtotal. The base price will be added once
                it&apos;s announced.
              </p>
            </div>
            <Configurator />
          </div>
        </section>

        {/* Lifetime options */}
        <section className="section section--tight" id="lifetime" aria-labelledby="lifetime-title">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Lifetime options</p>
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
            <div className="section-head">
              <p className="eyebrow">FAQ</p>
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
            <div>
              <p className="eyebrow">Enquiries</p>
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
            <div className="enquire__card">
              <h3 className="h3">Project status</h3>
              <ul className="kv">
                <li>
                  <span>Stage</span>
                  <span>Prototype in development</span>
                </li>
                <li>
                  <span>Base price</span>
                  <span>To be confirmed</span>
                </li>
                <li>
                  <span>Availability</span>
                  <span>{availability ?? "Not yet available"}</span>
                </li>
                <li>
                  <span>Fulfilment terms</span>
                  <span>{fulfilmentTerms ?? "To be published"}</span>
                </li>
                <li>
                  <span>Enquiries</span>
                  <span>{contact.email ? "Open" : "Not yet open"}</span>
                </li>
              </ul>
            </div>
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
          <div className="site-footer__legal">
            <p>
              Hackulator is an independent prototype project{contact.businessName ? ` by ${contact.businessName}` : ""}.
              It is not affiliated with, endorsed by or sponsored by Casio Computer Co., Ltd. Casio and fx-83GT are
              trademarks of their respective owner and are used only to describe compatibility.
            </p>
            <p>
              The concept film and screens are visualisations of a device in development, not a finished product.
              Game names marked &ldquo;-style&rdquo; are original works inspired by genres.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
