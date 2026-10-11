import { decodeShare } from "@/lib/pricing";
import { readCatalogue } from "@/lib/server/catalogue";
import { createOrder } from "@/lib/server/orders";
import { json, readJson, withAdmin } from "@/lib/server/http";

export async function POST(req: Request) {
  return withAdmin(req, async ({ db, admin }) => {
    const body = await readJson(req);
    let build = body.build;
    // A share link or code from the public configurator can be pasted in.
    if (typeof body.shareCode === "string" && body.shareCode.trim()) {
      const raw = body.shareCode.trim();
      const code = raw.includes("build=") ? new URL(raw, "https://x").searchParams.get("build") ?? "" : raw;
      const decoded = decodeShare(code, await readCatalogue(db));
      if (!decoded) return json({ error: "That build link couldn't be read." }, 400);
      build = {
        ...decoded,
        coverName: { ...decoded.coverName, text: typeof body.coverName === "string" ? body.coverName : "" },
        ui: { ...decoded.ui, welcome: typeof body.welcome === "string" && body.welcome ? body.welcome : decoded.ui.welcome },
      };
    }
    const order = await createOrder(db, admin.email, { ...body, build });
    return json({ id: order.id, reference: order.reference }, 201);
  });
}
