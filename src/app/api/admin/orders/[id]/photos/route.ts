import { addPhoto } from "@/lib/server/orders";
import { idParam, json, withAdmin } from "@/lib/server/http";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async ({ db, admin }) => {
    const id = idParam((await ctx.params).id);
    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > 5 * 1024 * 1024) return json({ error: "Photos must be 4 MB or smaller." }, 413);
    const form = await req.formData();
    const file = form.get("photo");
    if (!(file instanceof Blob)) return json({ error: "Choose a photo." }, 400);
    const photoId = await addPhoto(db, admin.email, id, new Uint8Array(await file.arrayBuffer()), String(form.get("caption") ?? ""));
    return json({ id: photoId }, 201);
  });
}
