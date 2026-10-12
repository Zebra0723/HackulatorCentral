import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Logo } from "@/components/Logo";
import { SESSION_COOKIE, adminFromToken } from "@/lib/server/auth";
import { dbMode, getDb } from "@/lib/server/db";

/** There is no login form: the owner types their code on the virtual calculator on the homepage. */
export default async function LoginPage() {
  const mode = dbMode();
  const db = mode === "none" ? null : await getDb().catch(() => null);
  if (db && (await adminFromToken(db, (await cookies()).get(SESSION_COOKIE)?.value))) redirect("/admin");

  return (
    <main className="a-login">
      <div className="a-login__card">
        <Logo alt="Hackulator" className="a-login__logo" />
        <h1>Control room</h1>
        {!db ? (
          <div className="a-note">
            <p>
              <strong>No database is connected.</strong> In Vercel, open Storage → Create Database → Neon and connect it to
              this project, then redeploy.
            </p>
          </div>
        ) : (
          <p className="a-note">
            Type your owner code on the calculator on the <Link href="/#games">homepage</Link> to open the control room.
          </p>
        )}
        {mode === "demo" && <p className="a-demo-pill">Local demo mode: data lives on this computer only</p>}
      </div>
    </main>
  );
}
