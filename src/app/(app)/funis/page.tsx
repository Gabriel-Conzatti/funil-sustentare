import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { NewFunnelButton } from "./NewFunnelButton";
import { Filter, Layers, ArrowRight, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FunisPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const q = (searchParams.q || "").trim();
  const status = searchParams.status || "";

  const funnels = await prisma.funnel.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: {
          stages: { where: { deletedAt: null } },
          clients: { where: { deletedAt: null } },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Construtor de funis"
        subtitle="Crie funis e etapas ilimitadas — tudo configurável, nada fixo."
        crumbs={[{ label: "Funis" }]}
        actions={<NewFunnelButton />}
      />

      <form action="/funis" className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar funil pelo nome..."
            className="input pl-10"
          />
        </div>
        <select name="status" defaultValue={status} className="input sm:w-48">
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
        </select>
        <button className="btn-secondary" type="submit">
          Filtrar
        </button>
      </form>

      {funnels.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Filter size={40} className="text-outline" />
          <p className="text-body-lg text-content">
            {q || status ? "Nenhum funil encontrado" : "Nenhum funil criado"}
          </p>
          <p className="text-body-md text-content-variant">
            {q || status
              ? "Tente outro nome ou status."
              : "Comece criando seu primeiro funil comercial."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {funnels.map((f) => (
            <Link key={f.id} href={`/funis/${f.id}`} className="card-hover group">
              <div className="flex items-start justify-between">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${f.color}22`, color: f.color }}
                >
                  <Filter size={20} />
                </span>
                <span
                  className={`badge ${
                    f.status === "ATIVO"
                      ? "bg-primary-container text-primary"
                      : "bg-surface-high text-outline"
                  }`}
                >
                  {f.status}
                </span>
              </div>
              <h3 className="mt-4 text-title-md text-content">{f.name}</h3>
              {f.description && (
                <p className="mt-1 line-clamp-2 text-body-md text-content-variant">{f.description}</p>
              )}
              <div className="mt-4 flex items-center gap-4 text-label-md text-content-variant">
                <span className="flex items-center gap-1.5">
                  <Layers size={16} /> {f._count.stages} etapas
                </span>
                <span className="flex items-center gap-1.5">
                  {f._count.clients} clientes
                </span>
                <ArrowRight
                  size={18}
                  className="ml-auto text-outline transition-transform group-hover:translate-x-1 group-hover:text-secondary"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
