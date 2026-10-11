/**
 * Create (or reset the password of) the owner account. There is no sign-up
 * page; this is the only way to make an admin.
 *
 *   npm run admin:create -- --email you@example.com
 *
 * Uses DATABASE_URL when set, otherwise the local demo database.
 * The password is typed at a hidden prompt (or read from ADMIN_PASSWORD for automation).
 */
import { createInterface } from "node:readline";

async function ask(question: string, hidden: boolean): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    out._writeToOutput = (s: string) => {
      if (s.includes(question)) out.output.write(s);
      else out.output.write("*");
    };
  }
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    }),
  );
}

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--email");
  const email = i >= 0 ? args[i + 1] : await ask("Owner email: ", false);
  if (!email) throw new Error("An email is required: npm run admin:create -- --email you@example.com");
  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    password = await ask("Choose a password (12+ characters): ", true);
    const again = await ask("Type it again: ", true);
    if (password !== again) throw new Error("The passwords didn't match. Nothing was changed.");
  }
  const { getDb, dbMode } = await import("../src/lib/server/db");
  const { createAdmin } = await import("../src/lib/server/auth");
  const db = await getDb();
  if (!db) throw new Error("No database. Set DATABASE_URL (see README).");
  const admin = await createAdmin(db, email, password);
  console.log(`\nOwner account ready: ${admin.email} (${dbMode() === "demo" ? "local demo database" : "production database"}).`);
  console.log("Sign in at /admin/login. Any existing sessions for this account were signed out.");
  process.exit(0);
}

main().catch((e) => {
  console.error(`\n${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
