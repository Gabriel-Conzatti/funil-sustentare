import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_TINT: Record<string, string> = {
  ATIVO: "bg-primary-container text-primary",
  INATIVO: "bg-surface-high text-content-variant",
  BLOQUEADO: "bg-danger-container/30 text-danger",
  FERIAS: "bg-tertiary-container/30 text-tertiary",
  DESLIGADO: "bg-surface-high text-outline",
};

export default async function UsuariosPage() {
  const current = await getCurrentUser();
  if (current?.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { clients: { where: { deletedAt: null } } } } },
  });

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle={`${users.length} usuário(s) cadastrado(s)`}
        crumbs={[{ label: "Usuários" }]}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-cyan-signal/15 text-label-sm uppercase text-outline">
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Clientes</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Último login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-cyan-signal/10 hover:bg-surface-high">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-label-sm font-semibold text-surface"
                      style={{ backgroundColor: u.color }}
                    >
                      {u.name[0]?.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-body-md text-content">{u.fullName}</p>
                      <p className="text-label-sm text-outline">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-content-variant">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-primary-container text-primary">{u.role}</span>
                </td>
                <td className="px-4 py-3 text-content-variant">{u._count.clients}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_TINT[u.status] || ""}`}>{u.status}</span>
                </td>
                <td className="px-4 py-3 text-label-sm text-outline">
                  {formatDateTime(u.lastLoginAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
