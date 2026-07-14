import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { UsersManager, type UserRow } from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const current = await getCurrentUser();
  if (current?.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { clients: { where: { deletedAt: null } } } } },
  });

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    lastName: u.lastName,
    fullName: u.fullName,
    email: u.email,
    username: u.username,
    role: u.role,
    status: u.status,
    phone: u.phone,
    whatsapp: u.whatsapp,
    jobTitle: u.jobTitle,
    color: u.color,
    notes: u.notes,
    clientCount: u._count.clients,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  }));

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle={`${users.length} usuário(s) cadastrado(s)`}
        crumbs={[{ label: "Usuários" }]}
      />

      <UsersManager users={rows} currentUserId={current.id} />
    </div>
  );
}
