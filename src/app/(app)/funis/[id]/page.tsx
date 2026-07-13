import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { FunnelSheet } from "./FunnelSheet";
import { ToggleFunnelStatus } from "./ToggleFunnelStatus";

export const dynamic = "force-dynamic";

export default async function FunnelDetailPage({ params }: { params: { id: string } }) {
  const funnel = await prisma.funnel.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      stages: {
        where: { deletedAt: null },
        orderBy: { order: "asc" },
        include: {
          clients: {
            where: { deletedAt: null, status: { in: ["ATIVO", "CONVERTIDO"] } },
            orderBy: { movedAt: "desc" },
            include: { responsible: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!funnel) notFound();

  const stages = funnel.stages.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    defaultMessage: s.defaultMessage,
  }));

  const clients = funnel.stages
    .flatMap((s) => s.clients)
    .map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      company: c.company,
      city: c.city,
      product: c.product,
      responsibleName: c.responsible?.name ?? null,
      stageId: c.stageId ?? "",
      updatedAt: c.updatedAt.toISOString(),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));

  return (
    <div>
      <PageHeader
        title={funnel.name}
        subtitle={funnel.description || "Planilha de clientes por etapa"}
        crumbs={[{ label: "Funis", href: "/funis" }, { label: funnel.name }]}
        actions={
          <div className="flex items-center gap-2">
            <span
              className={`badge ${
                funnel.status === "ATIVO"
                  ? "bg-primary-container text-primary"
                  : "bg-surface-high text-outline"
              }`}
            >
              {funnel.status === "ATIVO" ? "Ativo" : "Inativo"}
            </span>
            <ToggleFunnelStatus funnelId={funnel.id} status={funnel.status} />
          </div>
        }
      />

      <FunnelSheet
        funnelId={funnel.id}
        funnelName={funnel.name}
        stages={stages}
        initialClients={clients}
      />
    </div>
  );
}
