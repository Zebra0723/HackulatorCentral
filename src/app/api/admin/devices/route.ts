import { createDevice } from "@/lib/server/devices";
import { json, readJson, withAdmin } from "@/lib/server/http";

export async function POST(req: Request) {
  return withAdmin(req, async ({ db, admin }) => {
    const d = await createDevice(db, admin.email, await readJson(req));
    return json({ id: d.id, reference: d.reference }, 201);
  });
}
