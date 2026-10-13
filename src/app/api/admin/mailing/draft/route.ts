import { json, readJson, withAdmin } from "@/lib/server/http";
import { saveDraft } from "@/lib/server/mailing";

export async function PUT(req: Request) {
  return withAdmin(req, async ({ db, admin }) => json({ id: await saveDraft(db, admin.email, await readJson(req, 64 * 1024)) }));
}
