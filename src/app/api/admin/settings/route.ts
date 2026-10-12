import { json, readJson, withAdmin } from "@/lib/server/http";
import { saveSettings } from "@/lib/server/settings";

export async function PUT(req: Request) {
  return withAdmin(req, async ({ db, admin }) => json(await saveSettings(db, admin.email, await readJson(req))));
}
