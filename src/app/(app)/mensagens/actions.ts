"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createMessage(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!title || !content) return { ok: false, error: "Título e conteúdo são obrigatórios." };

  const stageId = String(formData.get("stageId") || "") || null;

  const message = await prisma.message.create({
    data: {
      title,
      content,
      category: String(formData.get("category") || "").trim() || null,
      stageId,
      isDefault: !!stageId,
      versions: { create: { content } },
    },
  });

  // Ao vincular uma etapa, a mensagem passa a ser a mensagem padrão daquela
  // etapa (é o texto enviado no funil).
  if (stageId) {
    await prisma.stage.update({
      where: { id: stageId },
      data: { defaultMessage: content },
    });
  }

  await audit({
    userId: user.id,
    entity: "Message",
    entityId: message.id,
    action: "CREATE",
    description: `Mensagem "${title}" criada${stageId ? " e definida como padrão da etapa" : ""}.`,
  });

  revalidatePath("/mensagens");
  if (stageId) revalidatePath("/funis");
  return { ok: true };
}
