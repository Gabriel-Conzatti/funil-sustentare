import { prisma } from "./prisma";
import { headers } from "next/headers";

interface AuditInput {
  userId?: string | null;
  entity: string;
  entityId?: string | null;
  action: string;
  description?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

function requestMeta() {
  try {
    const h = headers();
    const ua = h.get("user-agent") || undefined;
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      undefined;
    return { ua, ip };
  } catch {
    return { ua: undefined, ip: undefined };
  }
}

/** Registra um log de auditoria. Nunca deve quebrar o fluxo principal. */
export async function audit(input: AuditInput): Promise<void> {
  const { ua, ip } = requestMeta();
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        entity: input.entity,
        entityId: input.entityId ?? null,
        action: input.action,
        description: input.description,
        ip,
        browser: ua,
        oldValue: input.oldValue ? JSON.stringify(input.oldValue) : null,
        newValue: input.newValue ? JSON.stringify(input.newValue) : null,
      },
    });
  } catch (err) {
    console.error("[audit] falha ao registrar log:", err);
  }
}

/** Registra um item na linha do tempo (histórico) de um cliente. */
export async function clientHistory(input: {
  clientId: string;
  userId?: string | null;
  type: string;
  description: string;
}): Promise<void> {
  const { ip } = requestMeta();
  try {
    await prisma.clientHistory.create({
      data: {
        clientId: input.clientId,
        userId: input.userId ?? null,
        type: input.type,
        description: input.description,
        ip,
      },
    });
  } catch (err) {
    console.error("[clientHistory] falha:", err);
  }
}
