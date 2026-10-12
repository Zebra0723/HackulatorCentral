import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdminPage } from "@/lib/server/http";
import { getSettings } from "@/lib/server/settings";

export default async function SettingsPage() {
  const { db } = await requireAdminPage();
  const values = await getSettings(db);
  return (
    <div className="a-stack a-narrow">
      <div className="a-head">
        <h1>Site settings</h1>
      </div>
      <p className="a-note">Changes appear on the website as soon as you save. Every change is recorded in Recent changes.</p>
      <section className="a-card">
        <SettingsForm values={values} />
      </section>
    </div>
  );
}
