import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { ListActions } from "./ListActions";
import { formatDateTime, formatPhone } from "@/lib/utils";
import { Users, Upload, PencilLine, ArrowRight, Search, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q || "").trim();

  const funnels = await prisma.funnel.findMany({
    where: { deletedAt: null, status: "ATIVO" },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });

  // Modo busca global: lista clientes individuais que batem com o termo.
  if (q) {
    const results = await prisma.client.findMany({
      where: {
        deletedAt: null,
        OR: [
          { fullName: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
          { company: { contains: q } },
          { city: { contains: q } },
          { product: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        funnel: { select: { name: true, color: true } },
        stage: { select: { name: true } },
        list: { select: { id: true, name: true } },
      },
    });

    return (
      <div>
        <PageHeader
          title="Busca de clientes"
          subtitle={`${results.length} resultado(s) para "${q}"`}
          crumbs={[{ label: "Clientes", href: "/clientes" }, { label: "Busca" }]}
          actions={
            <Link href="/clientes" className="btn-ghost">
              Voltar às listas
            </Link>
          }
        />

        <SearchBar defaultValue={q} />

        {results.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 py-16 text-center">
            <Users size={40} className="text-outline" />
            <p className="text-body-lg text-content">Nenhum cliente encontrado</p>
            <p className="text-body-md text-content-variant">
              Tente outro nome, telefone, e-mail ou cidade.
            </p>
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-cyan-signal/15 text-label-sm uppercase text-outline">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Lista</th>
                  <th className="px-4 py-3">Funil / Etapa</th>
                  <th className="px-4 py-3">Criado</th>
                </tr>
              </thead>
              <tbody>
                {results.map((c) => (
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
                      {c.list ? (
                        <Link
                          href={`/clientes/${c.list.id}?q=${encodeURIComponent(c.fullName)}`}
                          className="text-secondary hover:underline"
                        >
                          {c.list.name}
                        </Link>
                      ) : (
                        <span className="text-outline">—</span>
                      )}
                    </td>
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

  // Modo padrão: listas de clientes.
  const lists = await prisma.clientList.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { clients: { where: { deletedAt: null } } } },
    },
  });

  // Funis em uso por lista (distintos).
  const listIds = lists.map((l) => l.id);
  const funnelUsage = listIds.length
    ? await prisma.client.findMany({
        where: { deletedAt: null, listId: { in: listIds } },
        select: { listId: true, funnel: { select: { id: true, name: true, color: true } } },
      })
    : [];

  const funnelsByList = new Map<string, { id: string; name: string; color: string }[]>();
  for (const row of funnelUsage) {
    if (!row.listId || !row.funnel) continue;
    const arr = funnelsByList.get(row.listId) ?? [];
    if (!arr.some((f) => f.id === row.funnel!.id)) arr.push(row.funnel);
    funnelsByList.set(row.listId, arr);
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Listas de clientes a serem importadas ou criadas no sistema"
        crumbs={[{ label: "Clientes" }]}
        actions={<ListActions funnels={funnels} />}
      />

      <SearchBar />

      {lists.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Users size={40} className="text-outline" />
          <p className="text-body-lg text-content">Nenhuma lista ainda</p>
          <p className="text-body-md text-content-variant">
            Crie uma lista manualmente ou importe clientes a partir de um CSV/Excel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map((l) => {
            const imported = l.source === "IMPORTADA";
            const usedFunnels = funnelsByList.get(l.id) ?? [];
            return (
              <Link key={l.id} href={`/clientes/${l.id}`} className="card-hover group">
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-md ${
                      imported
                        ? "bg-secondary-container/30 text-secondary"
                        : "bg-primary-container text-primary"
                    }`}
                  >
                    {imported ? <Upload size={20} /> : <PencilLine size={20} />}
                  </span>
                  <span
                    className={`badge ${
                      imported
                        ? "bg-secondary-container/30 text-secondary"
                        : "bg-primary-container text-primary"
                    }`}
                  >
                    {imported ? "Importada" : "Manual"}
                  </span>
                </div>
                <h3 className="mt-4 text-title-md text-content">{l.name}</h3>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-label-md text-content-variant">
                  <span className="flex items-center gap-1.5">
                    <Users size={16} /> {l._count.clients} clientes
                  </span>
                  <span className="text-label-sm text-outline">
                    {imported ? "Importada" : "Criada"} em {formatDateTime(l.createdAt)}
                  </span>
                </div>

                <div className="mt-3 border-t border-cyan-signal/10 pt-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-label-sm uppercase text-outline">
                    <Filter size={13} /> Funis em uso
                  </p>
                  {usedFunnels.length === 0 ? (
                    <span className="text-label-sm text-outline">Nenhum ainda</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {usedFunnels.map((f) => (
                        <span
                          key={f.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-signal/20 px-2.5 py-0.5 text-label-sm text-content-variant"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: f.color }}
                          />
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex justify-end">
                  <ArrowRight
                    size={18}
                    className="text-outline transition-transform group-hover:translate-x-1 group-hover:text-secondary"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/clientes" className="mb-4">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder="Buscar cliente por nome, telefone, e-mail, cidade..."
          className="input pl-10"
        />
      </div>
    </form>
  );
}
