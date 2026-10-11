import { CatalogueEditor } from "@/components/admin/CatalogueEditor";
import { readCatalogue } from "@/lib/server/catalogue";
import { requireAdminPage } from "@/lib/server/http";

export default async function CataloguePage() {
  const { db } = await requireAdminPage();
  const catalogue = await readCatalogue(db);
  return (
    <div className="a-stack">
      <h1>Games and packs</h1>
      <p className="a-muted">
        One shared catalogue. Changes here update the website configurator, previews, pricing and summaries straight away.
        Orders that were already accepted keep the prices they were accepted at.
      </p>
      <CatalogueEditor games={[...catalogue.games]} packs={catalogue.packs.map((p) => ({ ...p, gameIds: [...p.gameIds] }))} />
    </div>
  );
}
