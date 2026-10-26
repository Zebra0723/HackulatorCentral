import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Sponsor } from "@/components/Sponsor";
import { MySpot } from "@/components/MySpot";

export const metadata: Metadata = {
  title: "My waitlist spot · Hackulator",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function MySpotPage() {
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
        <MySpot />
      </main>
    </div>
  );
}
