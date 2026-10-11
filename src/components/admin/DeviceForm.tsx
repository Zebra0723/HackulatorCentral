"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Feedback, useApi } from "./useApi";

interface DeviceValues {
  id: number;
  ownerName: string;
  order: string;
  hardwareRevision: string;
  softwareVersion: string;
  owned: string;
  installed: string;
  notes: string;
}

export function DeviceForm({ device, defaultOrder = "" }: { device: DeviceValues | null; defaultOrder?: string }) {
  const router = useRouter();
  const { call, busy, error, message } = useApi();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      orderId: fd.get("order") || null,
      ownerName: fd.get("ownerName"),
      hardwareRevision: fd.get("hardwareRevision"),
      softwareVersion: fd.get("softwareVersion"),
      owned: fd.get("owned"),
      installed: fd.get("installed"),
      notes: fd.get("notes"),
    };
    if (device) await call("PUT", `/api/admin/devices/${device.id}`, body, { success: "Saved." });
    else {
      const res = await call<{ id: number }>("POST", "/api/admin/devices", body, { refresh: false });
      if (res?.id) router.push(`/admin/devices/${res.id}`);
    }
  }
  return (
    <form className="a-form" onSubmit={onSubmit}>
      <div className="a-grid2">
        <label className="a-field"><span>Owner name</span><input name="ownerName" defaultValue={device?.ownerName} maxLength={80} /></label>
        <label className="a-field"><span>Linked order (e.g. ORD-0001)</span><input name="order" defaultValue={device?.order ?? defaultOrder} /></label>
      </div>
      <div className="a-grid2">
        <label className="a-field"><span>Hardware revision</span><input name="hardwareRevision" defaultValue={device?.hardwareRevision} placeholder="when known" /></label>
        <label className="a-field"><span>Installed software version</span><input name="softwareVersion" defaultValue={device?.softwareVersion} /></label>
      </div>
      <div className="a-grid2">
        <label className="a-field"><span>Owned games / software / passes</span><textarea name="owned" rows={4} defaultValue={device?.owned} placeholder="One per line" /></label>
        <label className="a-field"><span>Currently installed</span><textarea name="installed" rows={4} defaultValue={device?.installed} placeholder="One per line" /></label>
      </div>
      <label className="a-field"><span>Notes</span><textarea name="notes" rows={2} defaultValue={device?.notes} /></label>
      <Feedback error={error} message={message} />
      <button className="a-btn a-btn--primary a-btn--sm" disabled={busy}>{device ? "Save device" : "Add device"}</button>
    </form>
  );
}
