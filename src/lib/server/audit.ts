import "server-only";
import type { Db } from "./db";

export async function audit(db: Db, actor: string, action: string, entity: string, entityId: string | number | null, detail?: unknown) {
  await db.query("insert into audit_log (actor, action, entity, entity_id, detail) values ($1,$2,$3,$4,$5::jsonb)", [
    actor,
    action,
    entity,
    entityId == null ? null : String(entityId),
    detail === undefined ? null : JSON.stringify(detail),
  ]);
}

export interface AuditEntry {
  id: number;
  at: Date;
  actor: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: unknown;
}

export async function recentAudit(db: Db, limit = 20, entity?: string, entityId?: string | number) {
  if (entity && entityId != null) {
    return db.query<AuditEntry>(
      "select * from audit_log where entity = $1 and entity_id = $2 order by at desc, id desc limit $3",
      [entity, String(entityId), limit],
    );
  }
  return db.query<AuditEntry>("select * from audit_log order by at desc, id desc limit $1", [limit]);
}
