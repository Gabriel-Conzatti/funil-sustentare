"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createFunnel(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false, error: "Informe o nome do funil." };

  const count = await prisma.funnel.count();
  const funnel = await prisma.funnel.create({
    data: {
      name,
      description: String(formData.get("description") || "").trim() || null,
      color: String(formData.get("color") || "#00cbff"),
      icon: String(formData.get("icon") || "filter"),
      order: count,
    },
  });

  await audit({
    userId: user.id,
    entity: "Funnel",
    entityId: funnel.id,
    action: "CREATE",
    description: `Funil "${name}" criado.`,
  });

  revalidatePath("/funis");
  return { ok: true, id: funnel.id };
}

export async function toggleFunnelStatus(
  funnelId: string
): Promise<{ ok: boolean; error?: string; status?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const funnel = await prisma.funnel.findFirst({
    where: { id: funnelId, deletedAt: null },
  });
  if (!funnel) return { ok: false, error: "Funil não encontrado." };

  const newStatus = funnel.status === "ATIVO" ? "INATIVO" : "ATIVO";
  await prisma.funnel.update({
    where: { id: funnelId },
    data: { status: newStatus },
  });

  await audit({
    userId: user.id,
    entity: "Funnel",
    entityId: funnelId,
    action: "UPDATE",
    description: `Funil "${funnel.name}" ${newStatus === "ATIVO" ? "ativado" : "desativado"}.`,
    oldValue: { status: funnel.status },
    newValue: { status: newStatus },
  });

  revalidatePath("/funis");
  revalidatePath(`/funis/${funnelId}`);
  revalidatePath("/dashboard");
  return { ok: true, status: newStatus };
}

export async function addStage(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const funnelId = String(formData.get("funnelId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!funnelId || !name) return { ok: false, error: "Dados incompletos." };

  const count = await prisma.stage.count({ where: { funnelId, deletedAt: null } });
  const stage = await prisma.stage.create({
    data: {
      funnelId,
      name,
      color: String(formData.get("color") || "#a8c8ff"),
      defaultMessage: String(formData.get("defaultMessage") || "").trim() || null,
      order: count,
    },
  });

  await audit({
    userId: user.id,
    entity: "Stage",
    entityId: stage.id,
    action: "CREATE",
    description: `Etapa "${name}" adicionada.`,
  });

  revalidatePath(`/funis/${funnelId}`);
  revalidatePath("/funis");
  return { ok: true };
}
