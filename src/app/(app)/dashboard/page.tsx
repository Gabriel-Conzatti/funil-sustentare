import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getStaleClients, formatAge } from "@/lib/alerts";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Filter,
  MessageSquare,
  Target,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getMetrics() {
  const [total, ativos, convertidos, perdidos, funis, mensagens, convertedAgg] =
    await Promise.all([
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.client.count({ where: { deletedAt: null, status: "ATIVO" } }),
      prisma.client.count({ where: { deletedAt: null, status: "CONVERTIDO" } }),
      prisma.client.count({ where: { deletedAt: null, status: "PERDIDO" } }),
      prisma.funnel.count({ where: { deletedAt: null, status: "ATIVO" } }),
      prisma.sentMessage.count(),
      prisma.client.aggregate({
        where: { deletedAt: null, status: "CONVERTIDO" },
        _sum: { closedValue: true },
      }),
    ]);

  const totalConsiderado = convertidos + perdidos;
  const conversao = totalConsiderado > 0 ? (convertidos / totalConsiderado) * 100 : 0;
  const faturamento = convertedAgg._sum.closedValue || 0;
  const ticket = convertidos > 0 ? faturamento / convertidos : 0;

  return { total, ativos, convertidos, perdidos, funis, mensagens, conversao, faturamento, ticket };
}

async function getFunnelBoard() {
  return prisma.funnel.findMany({
    where: { deletedAt: null, status: "ATIVO" },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { clients: { where: { deletedAt: null } } } },
    },
  });
}

async function getRanking() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      color: true,
      _count: {
        select: { clients: { where: { deletedAt: null, status: "CONVERTIDO" } } },
      },
    },
  });
  return users
    .map((u) => ({ id: u.id, name: u.name, color: u.color, vendas: u._count.clients }))
    .sort((a, b) => b.vendas - a.vendas)
    .slice(0, 5);
}

function Card({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="card-hover animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-label-md text-content-variant">{label}</p>
          <p className="mt-2 text-headline-lg text-content">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-md ${tint}`}>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [m, funis, ranking] = await Promise.all([getMetrics(), getFunnelBoard(), getRanking()]);
  const maxRank = Math.max(1, ...ranking.map((r) => r.vendas));
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";
  const stale = await getStaleClients(6);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Indicadores em tempo real da operação comercial" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card icon={Users} label="Total de clientes" value={String(m.total)} tint="bg-primary-container text-primary" />
        <Card icon={TrendingUp} label="Clientes ativos" value={String(m.ativos)} tint="bg-secondary-container/30 text-secondary" />
        <Card icon={CheckCircle2} label="Convertidos" value={String(m.convertidos)} tint="bg-success/20 text-success" />
        {isAdmin && (
          <Card icon={XCircle} label="Perdidos" value={String(m.perdidos)} tint="bg-danger-container/30 text-danger" />
        )}
        <Card icon={Filter} label="Funis ativos" value={String(m.funis)} tint="bg-primary-container text-primary" />
        <Card icon={Target} label="Taxa de conversão" value={`${m.conversao.toFixed(1)}%`} tint="bg-accent/20 text-accent" />
        {isAdmin && (
          <Card icon={DollarSign} label="Valor vendido" value={formatCurrency(m.faturamento)} tint="bg-success/20 text-success" />
        )}
        <Card icon={MessageSquare} label="Mensagens enviadas" value={String(m.mensagens)} tint="bg-secondary-container/30 text-secondary" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`card ${isAdmin ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <h2 className="mb-4 text-title-md text-content">Clientes por funil</h2>
          {funis.length === 0 ? (
            <p className="text-body-md text-content-variant">Nenhum funil ativo ainda.</p>
          ) : (
            <div className="space-y-3">
              {funis.map((f) => {
                const max = Math.max(1, ...funis.map((x) => x._count.clients));
                const pct = (f._count.clients / max) * 100;
                return (
                  <div key={f.id}>
                    <div className="mb-1 flex items-center justify-between text-label-md">
                      <span className="text-content">{f.name}</span>
                      <span className="text-content-variant">{f._count.clients}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-lowest">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: f.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="card">
            <h2 className="mb-4 text-title-md text-content">Ranking de vendas</h2>
            {ranking.length === 0 ? (
              <p className="text-body-md text-content-variant">Sem dados.</p>
            ) : (
              <ol className="space-y-3">
                {ranking.map((r, i) => (
                  <li key={r.id} className="flex items-center gap-3">
                    <span className="w-5 text-label-md text-outline">{i + 1}º</span>
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-label-sm font-semibold text-surface"
                      style={{ backgroundColor: r.color }}
                    >
                      {r.name[0]?.toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-label-md text-content">
                        <span>{r.name}</span>
                        <span>{r.vendas}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-lowest">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${(r.vendas / maxRank) * 100}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/20 text-accent">
              <AlertTriangle size={18} />
            </span>
            <div>
              <h2 className="text-title-md text-content">
                Clientes sem atualização há +{stale.hours}h
              </h2>
              <p className="text-label-sm text-outline">
                {stale.count} cliente(s) parado(s) precisam de atenção
              </p>
            </div>
          </div>

          {stale.items.length === 0 ? (
            <p className="py-6 text-center text-body-md text-content-variant">
              Tudo em dia — nenhum cliente parado há mais de {stale.hours}h. 🎉
            </p>
          ) : (
            <div className="divide-y divide-cyan-signal/10">
              {stale.items.map((c) => (
                <Link
                  key={c.id}
                  href={
                    c.funnelId
                      ? `/funis/${c.funnelId}`
                      : c.listId
                        ? `/clientes/${c.listId}`
                        : `/clientes?q=${encodeURIComponent(c.fullName)}`
                  }
                  className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface-high"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body-md text-content">{c.fullName}</p>
                    <p className="text-label-sm text-outline">
                      {c.funnelName || c.listName || "Sem funil"}
                    </p>
                  </div>
                  <span className="badge shrink-0 bg-accent/20 text-accent">
                    {formatAge(c.updatedAt)}
                  </span>
                </Link>
              ))}
              {stale.count > stale.items.length && (
                <p className="pt-3 text-center text-label-sm text-outline">
                  + {stale.count - stale.items.length} outro(s) cliente(s) parado(s)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
