"use server";

import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  verifyPassword,
  hashPassword,
  isPasswordStrong,
} from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function changePassword(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!current || !next) return { ok: false, error: "Preencha todos os campos." };
  if (next !== confirm) return { ok: false, error: "A confirmação não confere." };
  if (!isPasswordStrong(next)) {
    return {
      ok: false,
      error: "A nova senha deve ter no mínimo 8 caracteres, com ao menos uma letra e um número.",
    };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { ok: false, error: "Usuário não encontrado." };

  const ok = await verifyPassword(current, dbUser.passwordHash);
  if (!ok) return { ok: false, error: "Senha atual incorreta." };

  if (await verifyPassword(next, dbUser.passwordHash)) {
    return { ok: false, error: "A nova senha deve ser diferente da atual." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });

  await audit({
    userId: user.id,
    entity: "User",
    entityId: user.id,
    action: "UPDATE",
    description: "Troca de senha realizada pelo próprio usuário.",
  });

  return { ok: true };
}
