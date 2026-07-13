"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, X, Loader2, Send } from "lucide-react";
import { moveClient } from "../../clientes/actions";
import { addStage } from "../actions";
import { buildWaMeLink, formatPhone, formatCurrency, renderTemplate } from "@/lib/utils";

interface ClientCard {
  id: string;
  fullName: string;
  phone: string;
  company: string | null;
  city: string | null;
  product: string | null;
  estimatedValue: number | null;
  responsibleName: string | null;
}

interface StageColumn {
  id: string;
  name: string;
  color: string;
  defaultMessage: string | null;
  clients: ClientCard[];
}

export function FunnelBoard({
  funnelId,
  funnelName,
  initialStages,
}: {
  funnelId: string;
  funnelName: string;
  initialStages: StageColumn[];
}) {
  const router = useRouter();
  const [stages, setStages] = useState<StageColumn[]>(initialStages);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Atualização otimista
    const next = structuredClone(stages) as StageColumn[];
    const from = next.find((s) => s.id === source.droppableId)!;
    const to = next.find((s) => s.id === destination.droppableId)!;
    const [moved] = from.clients.splice(source.index, 1);
    to.clients.splice(destination.index, 0, moved);
    setStages(next);

    startTransition(async () => {
      const res = await moveClient(draggableId, destination.droppableId);
      if (!res.ok) {
        setStages(initialStages);
        router.refresh();
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

  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage.id} className="flex w-80 shrink-0 flex-col">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h3 className="text-label-md font-semibold text-content">{stage.name}</h3>
                  <span className="rounded-full bg-surface-high px-2 text-label-sm text-content-variant">
                    {stage.clients.length}
                  </span>
                </div>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[120px] flex-1 space-y-2 rounded-lg border p-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? "border-cyan-signal/60 bg-surface-high"
                        : "border-cyan-signal/10 bg-surface-container-low"
                    }`}
                  >
                    {stage.clients.map((c, index) => (
                      <Draggable key={c.id} draggableId={c.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`rounded-md border bg-surface-container p-3 ${
                              dragSnapshot.isDragging
                                ? "border-cyan-signal shadow-lg"
                                : "border-cyan-signal/15"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-label-md text-content">{c.fullName}</p>
                              <a
                                href={buildWaMeLink(
                                  c.phone,
                                  renderTemplate(stage.defaultMessage || "Olá {nome}!", {
                                    nome: c.fullName.split(" ")[0],
                                    telefone: formatPhone(c.phone),
                                    cidade: c.city,
                                    empresa: c.company,
                                    produto: c.product,
                                    consultor: c.responsibleName,
                                    funil: funnelName,
                                    etapa: stage.name,
                                  })
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 rounded p-1 text-secondary hover:bg-cyan-signal/10"
                                title="Enviar WhatsApp"
                              >
                                <Send size={15} />
                              </a>
                            </div>
                            <p className="mt-1 text-label-sm text-outline">{formatPhone(c.phone)}</p>
                            {c.product && (
                              <p className="text-label-sm text-content-variant">{c.product}</p>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-label-sm text-outline">
                                {c.responsibleName || "—"}
                              </span>
                              {c.estimatedValue != null && (
                                <span className="text-label-sm text-secondary">
                                  {formatCurrency(c.estimatedValue)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {stage.clients.length === 0 && !snapshot.isDraggingOver && (
                      <p className="py-6 text-center text-label-sm text-outline">Arraste clientes aqui</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}

          {/* Adicionar etapa */}
          <div className="w-72 shrink-0">
            <button
              onClick={() => setAddOpen(true)}
              className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-cyan-signal/25 text-content-variant hover:border-cyan-signal/60 hover:text-content"
            >
              <Plus size={22} />
              <span className="text-label-md">Adicionar etapa</span>
            </button>
          </div>
        </div>
      </DragDropContext>

      {pending && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-md bg-surface-container px-3 py-2 text-label-sm text-content-variant shadow-lg">
          <Loader2 size={14} className="animate-spin" /> Salvando...
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
                <label className="label">Mensagem padrão (aceita {"{nome}"}, {"{produto}"}...)</label>
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
