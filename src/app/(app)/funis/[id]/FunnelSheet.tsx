"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Send, Check, MessageSquarePlus, AlertTriangle, Trash2 } from "lucide-react";
import { moveClient, addObservation, deleteClient, getObservations, type ObservationView } from "../../clientes/actions";
import { addStage, deleteStage } from "../actions";
import { buildWaMeLink, formatPhone, renderTemplate } from "@/lib/utils";

const STALE_MS = 48 * 60 * 60 * 1000;

function staleLabel(updatedAt: string | null | undefined): string | null {
  if (!updatedAt) return null;
  const t = new Date(updatedAt).getTime();
  if (Number.isNaN(t)) return null;
  const ms = Date.now() - t;
  if (ms < STALE_MS) return null;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return `Sem contato há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Sem contato há ${days} dia${days > 1 ? "s" : ""}`;
}

interface StageCol {
  id: string;
  name: string;
  color: string;
  defaultMessage: string | null;
}

interface ClientRow {
  id: string;
  fullName: string;
  phone: string;
  company: string | null;
  city: string | null;
  product: string | null;
  responsibleName: string | null;
  stageId: string;
  updatedAt: string;
}

export function FunnelSheet({
  funnelId,
  funnelName,
  stages,
  initialClients,
}: {
  funnelId: string;
  funnelName: string;
  stages: StageCol[];
  initialClients: ClientRow[];
}) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  // Confirmação para desmarcar / voltar etapa
  const [confirmData, setConfirmData] = useState<
    { client: ClientRow; targetStageId: string | null; targetName: string } | null
  >(null);

  // Modal de observação
  const [obsClient, setObsClient] = useState<ClientRow | null>(null);
  const [obsText, setObsText] = useState("");
  const [obsError, setObsError] = useState<string | null>(null);
  const [obsList, setObsList] = useState<ObservationView[]>([]);
  const [obsLoading, setObsLoading] = useState(false);

  // Exclusões
  const [deletingClient, setDeletingClient] = useState<ClientRow | null>(null);
  const [deletingStage, setDeletingStage] = useState<{ id: string; name: string } | null>(null);

  function openObs(c: ClientRow) {
    setObsText("");
    setObsError(null);
    setObsClient(c);
    setObsList([]);
    setObsLoading(true);
    getObservations(c.id).then((list) => {
      setObsList(list);
      setObsLoading(false);
    });
  }

  function removeClient() {
    if (!deletingClient) return;
    const id = deletingClient.id;
    startTransition(async () => {
      const res = await deleteClient(id);
      if (res.ok) {
        setClients((cs) => cs.filter((c) => c.id !== id));
        setDeletingClient(null);
        router.refresh();
      }
    });
  }

  function removeStage() {
    if (!deletingStage) return;
    startTransition(async () => {
      const res = await deleteStage(deletingStage.id);
      if (res.ok) {
        setDeletingStage(null);
        router.refresh();
      }
    });
  }

  function doMove(clientId: string, stageId: string) {
    const prev = clients;
    setClients((cs) => cs.map((c) => (c.id === clientId ? { ...c, stageId } : c)));
    setSavingId(clientId);
    startTransition(async () => {
      const res = await moveClient(clientId, stageId);
      setSavingId(null);
      if (!res.ok) setClients(prev);
      router.refresh();
    });
  }

  function onCircleClick(client: ClientRow, stageIndex: number) {
    const currentIndex = stages.findIndex((s) => s.id === client.stageId);
    const targetStage = stages[stageIndex];

    // Avançar (marcar) → apenas move para a etapa (sem abrir mensagem).
    if (stageIndex > currentIndex) {
      doMove(client.id, targetStage.id);
      return;
    }

    // Clicar na etapa atual = desmarcar (voltar para a anterior).
    if (stageIndex === currentIndex) {
      const previous = stages[stageIndex - 1] || null;
      setConfirmData({
        client,
        targetStageId: previous ? previous.id : null,
        targetName: previous ? previous.name : "(nenhuma anterior)",
      });
      return;
    }

    // Clicar numa etapa anterior = voltar → confirmação.
    setConfirmData({ client, targetStageId: targetStage.id, targetName: targetStage.name });
  }

  function confirmUnmark() {
    if (!confirmData) return;
    if (confirmData.targetStageId) {
      doMove(confirmData.client.id, confirmData.targetStageId);
    }
    setConfirmData(null);
  }

  // Enviar mensagem (WhatsApp) e avançar para a próxima etapa.
  function advanceOnSend(client: ClientRow) {
    const currentIndex = stages.findIndex((s) => s.id === client.stageId);
    const next = stages[currentIndex + 1];
    if (next) doMove(client.id, next.id);
  }

  function submitObservation() {
    if (!obsClient) return;
    setObsError(null);
    startTransition(async () => {
      const res = await addObservation(obsClient.id, obsText);
      if (res.ok) {
        setObsText("");
        const list = await getObservations(obsClient.id);
        setObsList(list);
        router.refresh();
      } else {
        setObsError(res.error || "Erro ao salvar observação.");
      }
    });
  }

  function submitStage(formData: FormData) {
    formData.set("funnelId", funnelId);
    startTransition(async () => {
      const res = await addStage(formData);
      if (res.ok) {
        setAddOpen(false);
        router.refresh();
      }
    });
  }

  function messageFor(client: ClientRow, stage: StageCol | undefined): string {
    return renderTemplate(
      stage?.defaultMessage || "Olá {nome}!",
      {
        nome: client.fullName.split(" ")[0],
        nome_completo: client.fullName,
        telefone: formatPhone(client.phone),
        cidade: client.city,
        empresa: client.company,
        produto: client.product,
        consultor: client.responsibleName,
        responsavel: client.responsibleName,
        funil: funnelName,
        etapa: stage?.name,
      },
      { blankMissing: true }
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-label-md text-content-variant">
          {clients.length} cliente(s) · {stages.length} etapa(s)
        </p>
        <button className="btn-secondary" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Adicionar etapa
        </button>
      </div>

      {stages.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-body-lg text-content">Funil sem etapas</p>
          <p className="mt-1 text-body-md text-content-variant">
            Adicione a primeira etapa para montar a planilha.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-cyan-signal/15 text-label-sm uppercase text-outline">
                <th className="px-3 py-3 text-center">#</th>
                <th className="px-4 py-3">Cliente</th>
                {stages.map((s) => (
                  <th key={s.id} className="px-3 py-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                      <button
                        onClick={() => setDeletingStage({ id: s.id, name: s.name })}
                        title="Excluir etapa"
                        className="ml-1 rounded p-0.5 text-outline hover:bg-danger-container/30 hover:text-danger"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={stages.length + 3} className="px-4 py-10 text-center text-content-variant">
                    Nenhum cliente neste funil ainda.
                  </td>
                </tr>
              ) : (
                clients.map((c, idx) => {
                  const currentIndex = stages.findIndex((s) => s.id === c.stageId);
                  const currentStage = stages[currentIndex];
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-cyan-signal/10 text-body-md transition-colors hover:bg-surface-high"
                    >
                      <td className="px-3 py-3 text-center text-label-md text-outline">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="flex items-center gap-1.5 text-content">
                              {c.fullName}
                              {staleLabel(c.updatedAt) && (
                                <AlertTriangle
                                  size={14}
                                  className="shrink-0 text-accent"
                                  aria-label={staleLabel(c.updatedAt)!}
                                />
                              )}
                            </p>
                            <p className="text-label-sm text-outline">{formatPhone(c.phone)}</p>
                            {staleLabel(c.updatedAt) && (
                              <p className="mt-0.5 text-label-sm font-medium text-accent">
                                {staleLabel(c.updatedAt)}
                              </p>
                            )}
                          </div>
                          {savingId === c.id && (
                            <Loader2 size={14} className="animate-spin text-outline" />
                          )}
                        </div>
                      </td>

                      {stages.map((s, j) => {
                        const completed = j < currentIndex;
                        const current = j === currentIndex;
                        return (
                          <td key={s.id} className="px-3 py-3 text-center">
                            <button
                              onClick={() => onCircleClick(c, j)}
                              disabled={pending}
                              title={
                                current
                                  ? `Etapa atual: ${s.name} (clique para desmarcar)`
                                  : j > currentIndex
                                    ? `Marcar em: ${s.name}`
                                    : `Voltar para: ${s.name}`
                              }
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
                                current
                                  ? "border-transparent text-surface"
                                  : completed
                                    ? "border-transparent text-surface/80"
                                    : "border-outline/40 text-transparent hover:border-cyan-signal hover:bg-cyan-signal/10"
                              }`}
                              style={
                                current || completed
                                  ? { backgroundColor: s.color }
                                  : undefined
                              }
                              aria-pressed={current}
                            >
                              <Check size={15} className={current || completed ? "opacity-100" : "opacity-0"} />
                            </button>
                          </td>
                        );
                      })}

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={buildWaMeLink(c.phone, messageFor(c, currentStage))}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => advanceOnSend(c)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-signal/30 px-2.5 py-1.5 text-label-md text-secondary hover:bg-cyan-signal/10"
                            title="Enviar mensagem e avançar para a próxima etapa"
                          >
                            <Send size={15} /> Enviar
                          </a>
                          <button
                            onClick={() => openObs(c)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-signal/20 px-2.5 py-1.5 text-label-md text-content-variant hover:bg-surface-high hover:text-content"
                            title="Ver / adicionar observações"
                          >
                            <MessageSquarePlus size={15} /> Observação
                          </button>
                          <button
                            onClick={() => setDeletingClient(c)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-2.5 py-1.5 text-label-md text-danger hover:bg-danger-container/20"
                            title="Excluir cliente"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmação de desmarcar / voltar */}
      {confirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in w-full max-w-md rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <div className="mb-3 flex items-center gap-2 text-tertiary">
              <AlertTriangle size={20} />
              <h2 className="text-title-md text-content">Desmarcar etapa</h2>
            </div>
            <p className="text-body-md text-content-variant">
              Deseja mesmo desmarcar{" "}
              <span className="text-content">{confirmData.client.fullName}</span> e voltar para a
              etapa <span className="text-content">{confirmData.targetName}</span>?
            </p>
            {!confirmData.targetStageId && (
              <p className="mt-2 text-label-md text-danger">
                Não há etapa anterior — o cliente já está na primeira etapa.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirmData(null)}>
                Cancelar
              </button>
              <button
                className="btn-danger"
                disabled={!confirmData.targetStageId || pending}
                onClick={confirmUnmark}
              >
                Desmarcar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de observação */}
      {obsClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title-md text-content">Observações · {obsClient.fullName}</h2>
              <button onClick={() => setObsClient(null)} className="btn-ghost p-1">
                <X size={20} />
              </button>
            </div>
            {obsError && (
              <div className="mb-4 rounded-md border border-danger/40 bg-danger-container/30 px-4 py-2 text-label-md text-danger">
                {obsError}
              </div>
            )}

            <div className="mb-4">
              <p className="label">Histórico de observações</p>
              {obsLoading ? (
                <div className="flex items-center gap-2 py-4 text-label-md text-outline">
                  <Loader2 size={16} className="animate-spin" /> Carregando...
                </div>
              ) : obsList.length === 0 ? (
                <p className="rounded-md border border-cyan-signal/10 bg-surface-lowest px-3 py-4 text-center text-label-md text-outline">
                  Nenhuma observação ainda.
                </p>
              ) : (
                <ul className="max-h-56 space-y-2 overflow-y-auto">
                  {obsList.map((o) => (
                    <li key={o.id} className="rounded-md border border-cyan-signal/10 bg-surface-lowest px-3 py-2">
                      <p className="whitespace-pre-wrap text-body-md text-content">{o.text}</p>
                      <p className="mt-1 text-label-sm text-outline">
                        {o.userName || "—"} · {new Date(o.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="label">Nova observação</label>
            <textarea
              className="textarea min-h-[100px]"
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="Escreva a observação sobre este cliente..."
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setObsClient(null)}>
                Fechar
              </button>
              <button className="btn-primary" onClick={submitObservation} disabled={pending || !obsText.trim()}>
                {pending && <Loader2 size={18} className="animate-spin" />}
                Salvar observação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão de cliente */}
      {deletingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in w-full max-w-md rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <h2 className="mb-2 flex items-center gap-2 text-title-md text-content">
              <Trash2 size={18} className="text-danger" /> Excluir cliente
            </h2>
            <p className="text-body-md text-content-variant">
              Deseja excluir <span className="text-content">{deletingClient.fullName}</span>? Ele sai
              do funil, mas o histórico é preservado (soft delete).
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setDeletingClient(null)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={removeClient} disabled={pending}>
                {pending && <Loader2 size={18} className="animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão de etapa */}
      {deletingStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in w-full max-w-md rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <h2 className="mb-2 flex items-center gap-2 text-title-md text-content">
              <AlertTriangle size={18} className="text-tertiary" /> Excluir etapa
            </h2>
            <p className="text-body-md text-content-variant">
              Deseja excluir a etapa <span className="text-content">{deletingStage.name}</span>? Os
              clientes nela serão movidos para a etapa anterior.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setDeletingStage(null)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={removeStage} disabled={pending}>
                {pending && <Loader2 size={18} className="animate-spin" />}
                Excluir etapa
              </button>
            </div>
          </div>
        </div>
      )}


      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in w-full max-w-lg rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title-md text-content">Nova etapa</h2>
              <button onClick={() => setAddOpen(false)} className="btn-ghost p-1">
                <X size={20} />
              </button>
            </div>
            <form action={submitStage} className="space-y-4">
              <div>
                <label className="label">Nome *</label>
                <input name="name" className="input" required placeholder="Primeiro contato" />
              </div>
              <div>
                <label className="label">
                  Mensagem padrão (aceita {"{nome}"}, {"{produto}"}...)
                </label>
                <textarea
                  name="defaultMessage"
                  className="textarea"
                  placeholder="Olá {nome}, tudo bem? Aqui é da Sustentare sobre {produto}."
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="label mb-0">Cor</label>
                <input name="color" type="color" defaultValue="#a8c8ff" className="h-9 w-16 rounded bg-transparent" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setAddOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={pending}>
                  {pending && <Loader2 size={18} className="animate-spin" />}
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
