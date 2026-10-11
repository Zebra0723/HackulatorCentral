import { saveGame } from "@/lib/server/catalogue";
import { json, readJson, withAdmin } from "@/lib/server/http";

export async function POST(req: Request) {
  return withAdmin(req, async ({ db, admin }) => {
    const body = await readJson(req);
    await saveGame(db, admin.email, body as never, body.isNew === true);
    return json({ ok: true });
  });
}
