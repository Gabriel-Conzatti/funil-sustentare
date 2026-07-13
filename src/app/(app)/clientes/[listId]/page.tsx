import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { NewClientButton } from "../NewClientButton";
import { ListFunnelsPicker } from "./ListFunnelsPicker";
import { formatPhone, formatCurrency, formatDateTime } from "@/lib/utils";
import { CLIENT_STATUS_LABELS } from "@/lib/constants";
import { Search, Users, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_TINT: Record<string, string> = {
  ATIVO: "bg-primary-container text-primary",
  CONVERTIDO: "bg-success/20 text-success",
  PERDIDO: "bg-danger-container/30 text-danger",
  ARQUIVADO: "bg-surface-high text-content-variant",
  CANCELADO: "bg-surface-high text-outline",
};

export default async function ClientListPage({
  params,
  searchParams,
}: {
  params: { listId: string };
  searchParams: { q?: string; status?: string };
}) {
  const q = (searchParams.q || "").trim();
  const status = searchParams.status || "";

  const list = await prisma.clientList.findFirst({
    where: { id: params.listId, deletedAt: null },
    include: { funnels: { select: { id: true, name: true, color: true } } },
  });
  if (!list) notFound();

  const [clients, funnels, origins] = await Promise.all([
    prisma.client.findMany({
      where: {
        deletedAt: null,
        listId: list.id,
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { fullName: { contains: q } },
                { phone: { contains: q } },
                { email: { contains: q } },
                { company: { contains: q } },
                { city: { contains: q } },
                { product: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        funnel: { select: { name: true, color: true } },
        stage: { select: { name: true } },
        responsible: { select: { name: true } },
      },
    }),
    prisma.funnel.findMany({
      where: { deletedAt: null, status: "ATIVO" },
      orderBy: { order: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.origin.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const linkedFunnelIds = list.funnels.map((f) => f.id);

  return (
    <div>
      <PageHeader
        title={list.name}
        subtitle={`${clients.length} cliente(s) · ${
          list.source === "IMPORTADA" ? "Lista importada" : "Lista manual"
        }`}
        crumbs={[{ label: "Clientes", href: "/clientes" }, { label: list.name }]}
        actions={
          <div className="flex items-center gap-2">
            <ListFunnelsPicker
              listId={list.id}
              funnels={funnels}
              selectedIds={linkedFunnelIds}
            />
            <NewClientButton
              funnels={funnels.map((f) => ({ id: f.id, name: f.name }))}
              origins={origins}
              listId={list.id}
            />
          </div>
        }
      />

      <div className="card mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-label-sm uppercase text-outline">
          <Filter size={13} /> Funis vinculados
        </span>
        {list.funnels.length === 0 ? (
          <span className="text-label-md text-content-variant">
            Nenhum — use “Vincular funis” para escolher um ou mais.
          </span>
        ) : (
          list.funnels.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-signal/20 px-2.5 py-0.5 text-label-md text-content-variant"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
              {f.name}
            </span>
          ))
        )}
      </div>

      <form className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome, telefone, e-mail, empresa..."
            className="input pl-10"
          />
        </div>
        <select name="status" defaultValue={status} className="input sm:w-48">
          <option value="">Todos os status</option>
          {Object.entries(CLIENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="btn-secondary" type="submit">
          Filtrar
        </button>
      </form>

      {clients.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Users size={40} className="text-outline" />
          <p className="text-body-lg text-content">Nenhum cliente nesta lista</p>
          <p className="text-body-md text-content-variant">
            Adicione um cliente a esta lista para começar.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-cyan-signal/15 text-label-sm uppercase text-outline">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Funil / Etapa</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-cyan-signal/10 text-body-md transition-colors hover:bg-surface-high"
                >
                  <td className="px-4 py-3">
                    <p className="text-content">{c.fullName}</p>
                    {c.company && <p className="text-label-sm text-outline">{c.company}</p>}
                  </td>
                  <td className="px-4 py-3 text-content-variant">{formatPhone(c.phone)}</td>
                  <td className="px-4 py-3">
                    {c.funnel ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-content-variant">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: c.funnel.color }}
                          />
                          {c.funnel.name}
                        </span>
                        <p className="text-label-sm text-outline">{c.stage?.name ?? "—"}</p>
                      </>
                    ) : (
                      <span className="text-label-sm text-outline">Sem funil</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-content-variant">{c.responsible?.name || "—"}</td>
                  <td className="px-4 py-3 text-content-variant">
                    {formatCurrency(c.closedValue ?? c.estimatedValue)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_TINT[c.status] || ""}`}>
                      {CLIENT_STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-label-sm text-outline">
                    {formatDateTime(c.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
