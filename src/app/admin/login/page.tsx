import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/admin/LoginForm";
import { SESSION_COOKIE, adminCount, adminFromToken } from "@/lib/server/auth";
import { dbMode, getDb } from "@/lib/server/db";

export default async function LoginPage() {
  const mode = dbMode();
  const db = mode === "none" ? null : await getDb().catch(() => null);
  const admins = db ? await adminCount(db) : 0;
  if (db && (await adminFromToken(db, (await cookies()).get(SESSION_COOKIE)?.value))) redirect("/admin");

  return (
    <main className="a-login">
      <div className="a-login__card">
        <Logo alt="Hackulator" className="a-login__logo" />
        <h1>Control room</h1>
        {!db ? (
          <div className="a-note">
            <p>
              <strong>No database is connected.</strong> Add <code>DATABASE_URL</code> to the environment (see the README),
              then create your owner account with <code>npm run admin:create</code>.
            </p>
          </div>
        ) : admins === 0 ? (
          <div className="a-note">
            <p>
              <strong>No owner account yet.</strong> There is no sign-up page on purpose. Create your account from a terminal:
            </p>
            <pre>npm run admin:create -- --email you@example.com</pre>
            <p className="small">You&apos;ll be asked to type a password (at least 12 characters).</p>
          </div>
        ) : (
          <LoginForm />
        )}
        {mode === "demo" && <p className="a-demo-pill">Local demo mode: data lives on this computer only</p>}
      </div>
    </main>
  );
}
