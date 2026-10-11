import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOut } from "@/components/admin/SignOut";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminPage } from "@/lib/server/http";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { db, admin } = await requireAdminPage();
  return (
    <>
      <header className="a-top">
        <div className="a-top__row">
          <Link href="/admin" className="a-top__brand" aria-label="Control room home">
            <Logo alt="" className="a-top__logo" />
            <span>Control room</span>
          </Link>
          <div className="a-top__me">
            <span className="small">{admin.email}</span>
            <SignOut />
          </div>
        </div>
        <AdminNav />
        {db.mode === "demo" && (
          <p className="a-demo-banner">
            Local demo mode. Data is stored on this computer only; customers can&apos;t see it. Connect a database before
            using this for real orders.
          </p>
        )}
      </header>
      <main className="a-main">{children}</main>
    </>
  );
}
