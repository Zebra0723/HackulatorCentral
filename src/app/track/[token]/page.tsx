import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Sponsor } from "@/components/Sponsor";
import { TrackingCard } from "@/components/tracking/TrackingCard";
import { getDb } from "@/lib/server/db";
import { trackingView } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Follow your build · Hackulator",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getDb().catch(() => null);
  const view = db ? await trackingView(db, token) : null;

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
        {view ? (
          <TrackingCard view={view} photoBase={`/api/track/${token}/photos`} />
        ) : (
          <div className="track__missing">
            <h1 className="h2">This tracking link isn&apos;t valid</h1>
            <p className="lede">
              It may have been mistyped or replaced with a new one. Please use the latest link Hackulator sent you, or get in
              touch for a new one.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
