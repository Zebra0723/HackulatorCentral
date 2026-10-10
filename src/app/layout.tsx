import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hackulator · A calculator. Reimagined.",
  description:
    "Hackulator is an independent project in development: new electronics and a colour display inside a familiar scientific calculator shape, with games and a custom interface.",
  openGraph: {
    title: "Hackulator",
    description: "An independent calculator modification project in development.",
    images: [{ url: "/brand/hackulator-logo-original.webp", width: 1536, height: 1024, alt: "Hackulator logo" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#fcfaf6",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
