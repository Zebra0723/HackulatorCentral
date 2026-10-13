import { json, withAdmin } from "@/lib/server/http";
import { addEmailImage, listEmailImages } from "@/lib/server/mailing";

export async function GET(req: Request) {
  return withAdmin(req, async ({ db }) => json({ images: await listEmailImages(db) }));
}

/** Upload a picture for emails (multipart form field "image"). */
export async function POST(req: Request) {
  return withAdmin(req, async ({ db, admin }) => {
    if (Number(req.headers.get("content-length") ?? 0) > 4 * 1024 * 1024) return json({ error: "Pictures must be 3 MB or smaller." }, 413);
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof Blob)) return json({ error: "Choose a picture." }, 400);
    const name = file instanceof File ? file.name : "";
    return json(await addEmailImage(db, admin.email, new Uint8Array(await file.arrayBuffer()), name), 201);
  });
}
