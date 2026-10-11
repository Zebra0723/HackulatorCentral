import { audit } from "@/lib/server/audit";
import { exportAll } from "@/lib/server/devices";
import { withAdmin } from "@/lib/server/http";

/** Owner backup download (JSON). */
export async function GET(req: Request) {
  return withAdmin(req, async ({ db, admin }) => {
    const data = await exportAll(db);
    await audit(db, admin.email, "export", "system", null);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="hackulator-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
