import type { Metadata } from "next";
import "./admin.css";

// Every admin page checks the session on each request; never prerender any of it.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hackulator control room",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="admin">{children}</div>;
}
