import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MySpot } from "@/components/MySpot";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "My waitlist spot · Hackulator",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function MySpotPage() {
  return (
    <div className="track-page">
      <header className="track-page__bar">
        <div className="container">
          <Link href="/" aria-label="Hackulator home">
            <Logo alt="" className="track-page__logo" />
          </Link>
        </div>
      </header>
      <main className="container track-page__main">
        <MySpot email={siteConfig.contact.email} />
      </main>
    </div>
  );
}
