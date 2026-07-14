"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, isPasswordStrong } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { USER_ROLES, USER_STATUS } from "@/lib/constants";
import { revalidatePath } from "next/cache";

type Result = { ok: boolean; error?: string };

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

function buildFullName(name: string, lastName: string): string {
  return [name, lastName].filter(Boolean).join(" ").trim();
}

export async function createUser(formData: FormData): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Sem permissão." };

  const name = String(formData.get("name") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "USER");
  const status = String(formData.get("status") || "ATIVO");

  if (!name) return { ok: false, error: "Informe o nome." };
  if (!email) return { ok: false, error: "Informe o e-mail." };
  if (!username) return { ok: false, error: "Informe o nome de usuário." };
  if (!isPasswordStrong(password)) {
    return { ok: false, error: "Senha fraca: mínimo 8 caracteres, com letra e número." };
  }
  if (!USER_ROLES.includes(role as never)) return { ok: false, error: "Perfil inválido." };
  if (!USER_STATUS.includes(status as never)) return { ok: false, error: "Status inválido." };

  const dup = await prisma.user.findFirst({
    where: { deletedAt: null, OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (dup) {
    return {
      ok: false,
      error: dup.email === email ? "Já existe um usuário com este e-mail." : "Nome de usuário já em uso.",
    };
  }

  const user = await prisma.user.create({
    data: {
      name,
      lastName: lastName || null,
      fullName: buildFullName(name, lastName) || name,
      email,
      username,
      passwordHash: await hashPassword(password),
      role,
      status,
      phone: String(formData.get("phone") || "").trim() || null,
      whatsapp: String(formData.get("whatsapp") || "").trim() || null,
      jobTitle: String(formData.get("jobTitle") || "").trim() || null,
      color: String(formData.get("color") || "#a8c8ff"),
      notes: String(formData.get("notes") || "").trim() || null,
    },
  });

  await audit({
    userId: admin.id,
    entity: "User",
    entityId: user.id,
    action: "CREATE",
    description: `Usuário "${username}" criado (${role}).`,
  });

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function updateUser(userId: string, formData: FormData): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Sem permissão." };

  const target = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!target) return { ok: false, error: "Usuário não encontrado." };

  const name = String(formData.get("name") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const username = String(formData.get("username") || "").trim();
  const role = String(formData.get("role") || target.role);
  const status = String(formData.get("status") || target.status);

  if (!name || !email || !username) return { ok: false, error: "Nome, e-mail e usuário são obrigatórios." };
  if (!USER_ROLES.includes(role as never)) return { ok: false, error: "Perfil inválido." };
  if (!USER_STATUS.includes(status as never)) return { ok: false, error: "Status inválido." };

  // Impede o admin de rebaixar/bloquear a si mesmo (evita lock-out).
  if (userId === admin.id && (role !== "ADMIN" || status !== "ATIVO")) {
    return { ok: false, error: "Você não pode alterar seu próprio perfil/status." };
  }

  const dup = await prisma.user.findFirst({
    where: { deletedAt: null, id: { not: userId }, OR: [{ email }, { username }] },
    select: { email: true },
  });
  if (dup) return { ok: false, error: "E-mail ou nome de usuário já em uso por outro usuário." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      lastName: lastName || null,
      fullName: buildFullName(name, lastName) || name,
      email,
      username,
      role,
      status,
      phone: String(formData.get("phone") || "").trim() || null,
      whatsapp: String(formData.get("whatsapp") || "").trim() || null,
      jobTitle: String(formData.get("jobTitle") || "").trim() || null,
      color: String(formData.get("color") || target.color),
      notes: String(formData.get("notes") || "").trim() || null,
    },
  });

  await audit({
    userId: admin.id,
    entity: "User",
    entityId: userId,
    action: "UPDATE",
    description: `Usuário "${username}" atualizado.`,
  });

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function setUserStatus(userId: string, status: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Sem permissão." };
  if (!USER_STATUS.includes(status as never)) return { ok: false, error: "Status inválido." };
  if (userId === admin.id) return { ok: false, error: "Você não pode alterar seu próprio status." };

  const target = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!target) return { ok: false, error: "Usuário não encontrado." };

  await prisma.user.update({
    where: { id: userId },
    data: { status, loginAttempts: status === "ATIVO" ? 0 : target.loginAttempts },
  });

  await audit({
    userId: admin.id,
    entity: "User",
    entityId: userId,
    action: "UPDATE",
    description: `Status do usuário "${target.username}" alterado para ${status}.`,
  });

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function resetPassword(userId: string, newPassword: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Sem permissão." };
  if (!isPasswordStrong(newPassword)) {
    return { ok: false, error: "Senha fraca: mínimo 8 caracteres, com letra e número." };
  }
  const target = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!target) return { ok: false, error: "Usuário não encontrado." };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), loginAttempts: 0 },
  });

  await audit({
    userId: admin.id,
    entity: "User",
    entityId: userId,
    action: "UPDATE",
    description: `Senha do usuário "${target.username}" redefinida pelo admin.`,
  });

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function deleteUser(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Sem permissão." };
  if (userId === admin.id) return { ok: false, error: "Você não pode remover a si mesmo." };

  const target = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!target) return { ok: false, error: "Usuário não encontrado." };

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), status: "DESLIGADO" },
  });

  await audit({
    userId: admin.id,
    entity: "User",
    entityId: userId,
    action: "DELETE",
    description: `Usuário "${target.username}" removido (soft delete).`,
  });

  revalidatePath("/usuarios");
  return { ok: true };
}
