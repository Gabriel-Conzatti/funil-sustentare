import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { MessageEditor } from "./MessageEditor";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MensagensPage() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/dashboard");
  const [messages, stages] = await Promise.all([
    prisma.message.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { stage: { select: { name: true, funnel: { select: { name: true } } } } },
    }),
    prisma.stage.findMany({
      where: { deletedAt: null },
      orderBy: { order: "asc" },
      include: { funnel: { select: { name: true } } },
    }),
  ]);

  const stageOptions = stages.map((s) => ({
    id: s.id,
    label: `${s.funnel.name} › ${s.name}`,
  }));

  return (
    <div>
      <PageHeader
        title="Editor de mensagens"
        subtitle="Crie mensagens com variáveis dinâmicas — nada fixo no código."
        crumbs={[{ label: "Mensagens" }]}
      />

      <MessageEditor stages={stageOptions} />

      <div className="mt-8">
        <h2 className="mb-3 text-title-md text-content">Mensagens cadastradas</h2>
        {messages.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-12 text-center">
            <MessageSquare size={36} className="text-outline" />
            <p className="text-body-md text-content-variant">Nenhuma mensagem cadastrada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {messages.map((m) => (
              <div key={m.id} className="card-hover">
                <div className="flex items-center justify-between">
                  <h3 className="text-label-md font-semibold text-content">{m.title}</h3>
                  {m.category && (
                    <span className="badge bg-primary-container text-primary">{m.category}</span>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-body-md text-content-variant">
                  {m.content}
                </p>
                {m.stage && (
                  <p className="mt-3 text-label-sm text-outline">
                    {m.stage.funnel.name} › {m.stage.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
