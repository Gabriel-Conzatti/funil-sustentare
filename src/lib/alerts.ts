import { prisma } from "./prisma";

const STALE_HOURS = 48;

export interface StaleClient {
  id: string;
  fullName: string;
  updatedAt: Date;
  funnelId: string | null;
  funnelName: string | null;
  listId: string | null;
  listName: string | null;
}

export interface StaleAlerts {
  count: number;
  hours: number;
  items: StaleClient[];
}

/**
 * Retorna clientes ativos sem atualização há mais de 48h (leads parados).
 * `items` é limitado para exibição rápida; `count` é o total.
 */
export async function getStaleClients(limit = 8): Promise<StaleAlerts> {
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
  const where = {
    deletedAt: null,
    status: "ATIVO",
    updatedAt: { lt: cutoff },
  } as const;

  const [count, rows] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { updatedAt: "asc" },
      take: limit,
      select: {
        id: true,
        fullName: true,
        updatedAt: true,
        funnel: { select: { id: true, name: true } },
        list: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    count,
    hours: STALE_HOURS,
    items: rows.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      updatedAt: r.updatedAt,
      funnelId: r.funnel?.id ?? null,
      funnelName: r.funnel?.name ?? null,
      listId: r.list?.id ?? null,
      listName: r.list?.name ?? null,
    })),
  };
}

/** Ex.: "há 2 dias", "há 5 horas". */
export function formatAge(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const ms = Date.now() - d.getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}
