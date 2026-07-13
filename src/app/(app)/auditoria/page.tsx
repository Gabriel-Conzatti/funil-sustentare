import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/dashboard");
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Auditoria"
        subtitle="Registro imutável de todas as ações do sistema"
        crumbs={[{ label: "Auditoria" }]}
      />

      {logs.length === 0 ? (
        <div className="card py-12 text-center text-content-variant">Nenhum log registrado.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-cyan-signal/15 text-label-sm uppercase text-outline">
                <th className="px-4 py-3">Data/Hora</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-cyan-signal/10 hover:bg-surface-high">
                  <td className="px-4 py-3 text-label-sm text-outline">
                    {formatDateTime(l.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-content-variant">{l.user?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-surface-high text-content-variant">{l.entity}</span>
                  </td>
                  <td className="px-4 py-3 text-secondary">{l.action}</td>
                  <td className="px-4 py-3 text-content-variant">{l.description || "—"}</td>
                  <td className="px-4 py-3 text-label-sm text-outline">{l.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
