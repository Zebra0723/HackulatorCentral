import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Sponsor } from "@/components/Sponsor";
import { UnsubscribeButton } from "@/components/UnsubscribeButton";

export const metadata: Metadata = {
  title: "Unsubscribe · Hackulator",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Landing page for the unsubscribe link. A button press (not just opening the link) unsubscribes, so link scanners can't. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <div className="track-page">
      <header className="track-page__bar">
        <div className="container track-page__bar-inner">
          <Link href="/" aria-label="Hackulator home">
            <Logo alt="" className="track-page__logo" />
          </Link>
          <Sponsor tone="light" />
        </div>
      </header>
      <main className="container track-page__main">
        <div className="myspot">
          <p className="myspot__kicker">The Weekly Drop</p>
          {t ? (
            <UnsubscribeButton token={t} />
          ) : (
            <>
              <h1 className="h2">Unsubscribe</h1>
              <p className="lede">Use the Unsubscribe link at the bottom of any Weekly Drop to stop getting it.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
