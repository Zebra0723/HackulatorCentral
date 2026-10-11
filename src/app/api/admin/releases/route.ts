import { saveRelease } from "@/lib/server/devices";
import { json, readJson, withAdmin } from "@/lib/server/http";

export async function POST(req: Request) {
  return withAdmin(req, async ({ db, admin }) => {
    await saveRelease(db, admin.email, null, await readJson(req));
    return json({ ok: true }, 201);
  });
}
