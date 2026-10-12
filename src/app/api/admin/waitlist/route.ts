import { json, readJson, withAdmin } from "@/lib/server/http";
import { addWaitlistEntry } from "@/lib/server/waitlist";

export async function POST(req: Request) {
  return withAdmin(req, async ({ db, admin }) => {
    const id = await addWaitlistEntry(db, admin.email, await readJson(req));
    return json({ id }, 201);
  });
}
