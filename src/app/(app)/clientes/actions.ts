"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { audit, clientHistory } from "@/lib/audit";
import { onlyDigits, extractDDD } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export interface CreateClientResult {
  ok: boolean;
  error?: string;
  duplicateId?: string;
  clientId?: string;
}

export async function createClient(formData: FormData): Promise<CreateClientResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const fullName = String(formData.get("fullName") || "").trim();
  const phoneRaw = String(formData.get("phone") || "");
  const funnelId = String(formData.get("funnelId") || "") || null;
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const cpf = onlyDigits(String(formData.get("cpf") || ""));
  const listId = String(formData.get("listId") || "") || null;
  const force = formData.get("force") === "true";

  if (!fullName) return { ok: false, error: "Informe o nome completo." };
  const phone = onlyDigits(phoneRaw);
  if (phone.length < 10) return { ok: false, error: "Telefone inválido." };

  // Detecção de duplicidade (não bloqueia — usuário decide).
  if (!force) {
    const dup = await prisma.client.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { phone },
          ...(cpf ? [{ cpf }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
      select: { id: true },
    });
    if (dup) return { ok: false, duplicateId: dup.id };
  }

  // Funil é opcional. Se informado, o cliente entra na primeira etapa dele.
  let firstStage: { id: string; name: string } | null = null;
  if (funnelId) {
    firstStage = await prisma.stage.findFirst({
      where: { funnelId, deletedAt: null },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    });
    if (!firstStage) return { ok: false, error: "O funil selecionado não possui etapas." };
  }

  const client = await prisma.client.create({
    data: {
      fullName,
      phone,
      ddd: extractDDD(phone),
      whatsapp: phone,
      email: email || null,
      cpf: cpf || null,
      company: String(formData.get("company") || "").trim() || null,
      city: String(formData.get("city") || "").trim() || null,
      state: String(formData.get("state") || "").trim() || null,
      product: String(formData.get("product") || "").trim() || null,
      estimatedValue: parseMoney(formData.get("estimatedValue")),
      notes: String(formData.get("notes") || "").trim() || null,
      status: "ATIVO",
      funnelId,
      stageId: firstStage?.id ?? null,
      responsibleId: user.id,
      originId: (String(formData.get("originId") || "") || null) as string | null,
      listId,
    },
  });

  await clientHistory({
    clientId: client.id,
    userId: user.id,
    type: "CRIADO",
    description: firstStage
      ? `Cliente criado no funil e etapa "${firstStage.name}".`
      : "Cliente criado sem funil (a definir).",
  });
  await audit({
    userId: user.id,
    entity: "Client",
    entityId: client.id,
    action: "CREATE",
    description: `Cliente ${fullName} criado.`,
    newValue: { fullName, phone },
  });

  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  if (listId) revalidatePath(`/clientes/${listId}`);
  return { ok: true, clientId: client.id };
}

export async function moveClient(clientId: string, stageId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { stage: true },
  });
  if (!client) return { ok: false, error: "Cliente não encontrado." };

  const target = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!target) return { ok: false, error: "Etapa inválida." };

  await prisma.client.update({
    where: { id: clientId },
    data: { stageId, funnelId: target.funnelId, movedAt: new Date() },
  });
  const fromName = client.stage?.name ?? "(sem etapa)";
  await clientHistory({
    clientId,
    userId: user.id,
    type: "MOVIMENTACAO",
    description: `Movido de "${fromName}" para "${target.name}".`,
  });
  await audit({
    userId: user.id,
    entity: "Client",
    entityId: clientId,
    action: "UPDATE",
    description: "Movimentação de etapa",
    oldValue: { stage: fromName },
    newValue: { stage: target.name },
  });

  revalidatePath("/funis");
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function addObservation(
  clientId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const clean = text.trim();
  if (!clean) return { ok: false, error: "Escreva a observação." };

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, fullName: true, listId: true },
  });
  if (!client) return { ok: false, error: "Cliente não encontrado." };

  await prisma.observation.create({
    data: { clientId, userId: user.id, text: clean },
  });
  await clientHistory({
    clientId,
    userId: user.id,
    type: "OBSERVACAO",
    description: `Observação adicionada: "${clean.slice(0, 80)}${clean.length > 80 ? "…" : ""}"`,
  });
  await audit({
    userId: user.id,
    entity: "Client",
    entityId: clientId,
    action: "UPDATE",
    description: `Observação adicionada ao cliente ${client.fullName}.`,
  });

  revalidatePath("/funis");
  revalidatePath("/clientes");
  if (client.listId) revalidatePath(`/clientes/${client.listId}`);
  return { ok: true };
}

export async function deleteClient(
  clientId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, fullName: true, listId: true },
  });
  if (!client) return { ok: false, error: "Cliente não encontrado." };

  await prisma.client.update({
    where: { id: clientId },
    data: { deletedAt: new Date() },
  });
  await clientHistory({
    clientId,
    userId: user.id,
    type: "ARQUIVADO",
    description: "Cliente excluído (soft delete).",
  });
  await audit({
    userId: user.id,
    entity: "Client",
    entityId: clientId,
    action: "DELETE",
    description: `Cliente ${client.fullName} excluído.`,
  });

  revalidatePath("/funis");
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  if (client.listId) revalidatePath(`/clientes/${client.listId}`);
  return { ok: true };
}

export interface ObservationView {
  id: string;
  text: string;
  userName: string | null;
  createdAt: string;
}

export async function getObservations(clientId: string): Promise<ObservationView[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await prisma.observation.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    userName: r.user?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

function parseMoney(value: FormDataEntryValue | null): number | null {
  if (!value) return null;
  const n = Number(String(value).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// -------------------------------------------------------------------
// LISTAS DE CLIENTES
// -------------------------------------------------------------------

export async function createList(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false, error: "Informe o nome da lista." };

  const list = await prisma.clientList.create({
    data: {
      name,
      source: "MANUAL",
      notes: String(formData.get("notes") || "").trim() || null,
    },
  });

  await audit({
    userId: user.id,
    entity: "ClientList",
    entityId: list.id,
    action: "CREATE",
    description: `Lista "${name}" criada manualmente.`,
  });

  revalidatePath("/clientes");
  return { ok: true, id: list.id };
}

/** Vincula um ou mais funis a uma lista já criada. Clientes ainda sem funil
 *  são enviados para a primeira etapa do funil principal (o primeiro escolhido). */
export async function setListFunnels(
  listId: string,
  funnelIds: string[]
): Promise<{ ok: boolean; error?: string; assigned?: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const list = await prisma.clientList.findFirst({
    where: { id: listId, deletedAt: null },
  });
  if (!list) return { ok: false, error: "Lista não encontrada." };

  const ids = Array.from(new Set(funnelIds.filter(Boolean)));

  await prisma.clientList.update({
    where: { id: listId },
    data: { funnels: { set: ids.map((id) => ({ id })) } },
  });

  // Envia clientes sem funil para o funil principal (primeiro selecionado).
  let assigned = 0;
  if (ids.length > 0) {
    const primaryFunnelId = ids[0];
    const firstStage = await prisma.stage.findFirst({
      where: { funnelId: primaryFunnelId, deletedAt: null },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    if (firstStage) {
      const res = await prisma.client.updateMany({
        where: { listId, deletedAt: null, funnelId: null },
        data: { funnelId: primaryFunnelId, stageId: firstStage.id, movedAt: new Date() },
      });
      assigned = res.count;
    }
  }

  await audit({
    userId: user.id,
    entity: "ClientList",
    entityId: listId,
    action: "UPDATE",
    description: `Funis vinculados à lista "${list.name}" (${ids.length}). ${assigned} cliente(s) atribuído(s).`,
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${listId}`);
  revalidatePath("/dashboard");
  return { ok: true, assigned };
}

interface ParsedRow {
  fullName: string;
  phone: string;
  email?: string;
  city?: string;
  product?: string;
}

/** Faz o parse de um texto colado (CSV / TSV / ;) em linhas de cliente. */
function parseImportText(text: string): { rows: ParsedRow[]; skipped: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { rows: [], skipped: 0 };

  const detectDelimiter = (line: string): string => {
    if (line.includes("\t")) return "\t";
    if (line.includes(";")) return ";";
    return ",";
  };
  const delimiter = detectDelimiter(lines[0]);
  const split = (line: string) => line.split(delimiter).map((c) => c.trim());

  // Detecta cabeçalho por palavras-chave.
  const headerCells = split(lines[0]).map((c) => c.toLowerCase());
  const headerKeywords = ["nome", "telefone", "celular", "email", "e-mail", "cidade", "produto", "whatsapp", "fone"];
  const hasHeader = headerCells.some((c) => headerKeywords.some((k) => c.includes(k)));

  let map = { name: 0, phone: 1, email: -1, city: -1, product: -1 };
  let dataLines = lines;
  if (hasHeader) {
    const find = (keys: string[]) => headerCells.findIndex((c) => keys.some((k) => c.includes(k)));
    map = {
      name: Math.max(0, find(["nome"])),
      phone: Math.max(0, find(["telefone", "celular", "whatsapp", "fone"])),
      email: find(["email", "e-mail"]),
      city: find(["cidade"]),
      product: find(["produto"]),
    };
    dataLines = lines.slice(1);
  }

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const line of dataLines) {
    const cells = split(line);
    const fullName = (cells[map.name] || "").trim();
    const phone = onlyDigits(cells[map.phone] || "");
    if (!fullName || phone.length < 10) {
      skipped++;
      continue;
    }
    rows.push({
      fullName,
      phone,
      email: map.email >= 0 ? (cells[map.email] || "").trim().toLowerCase() || undefined : undefined,
      city: map.city >= 0 ? (cells[map.city] || "").trim() || undefined : undefined,
      product: map.product >= 0 ? (cells[map.product] || "").trim() || undefined : undefined,
    });
  }
  return { rows, skipped };
}

export async function importClients(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  id?: string;
  imported?: number;
  skipped?: number;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const name = String(formData.get("name") || "").trim();
  const funnelId = String(formData.get("funnelId") || "") || null;
  const text = String(formData.get("data") || "");

  if (!name) return { ok: false, error: "Informe o nome da lista." };

  const { rows, skipped } = parseImportText(text);
  if (rows.length === 0) {
    return { ok: false, error: "Nenhum cliente válido encontrado. Verifique o formato (nome e telefone)." };
  }

  // Funil é opcional: se informado, os clientes já entram na primeira etapa dele.
  let firstStageId: string | null = null;
  if (funnelId) {
    const firstStage = await prisma.stage.findFirst({
      where: { funnelId, deletedAt: null },
      orderBy: { order: "asc" },
    });
    if (!firstStage) return { ok: false, error: "O funil selecionado não possui etapas." };
    firstStageId = firstStage.id;
  }

  const list = await prisma.clientList.create({
    data: {
      name,
      source: "IMPORTADA",
      notes: `Importação de ${rows.length} cliente(s).`,
      ...(funnelId ? { funnels: { connect: { id: funnelId } } } : {}),
    },
  });

  await prisma.client.createMany({
    data: rows.map((r) => ({
      fullName: r.fullName,
      phone: r.phone,
      ddd: extractDDD(r.phone),
      whatsapp: r.phone,
      email: r.email || null,
      city: r.city || null,
      product: r.product || null,
      status: "ATIVO",
      funnelId,
      stageId: firstStageId,
      responsibleId: user.id,
      listId: list.id,
    })),
  });

  await audit({
    userId: user.id,
    entity: "ClientList",
    entityId: list.id,
    action: "IMPORT",
    description: `Lista "${name}" importada com ${rows.length} cliente(s) (${skipped} ignorado(s)).`,
  });

  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  return { ok: true, id: list.id, imported: rows.length, skipped };
}
