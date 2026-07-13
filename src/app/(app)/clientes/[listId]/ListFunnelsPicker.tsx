"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Filter, Loader2, Check, X, Plus } from "lucide-react";
import { setListFunnels } from "../actions";

interface FunnelOption {
  id: string;
  name: string;
  color: string;
}

export function ListFunnelsPicker({
  listId,
  funnels,
  selectedIds,
}: {
  listId: string;
  funnels: FunnelOption[];
  selectedIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await setListFunnels(listId, selected);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setMsg(res.error || "Erro ao vincular funis.");
      }
    });
  }

  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        <Filter size={16} /> Vincular funis
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in w-full max-w-lg rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title-md text-content">Vincular funis à lista</h2>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1">
                <X size={20} />
              </button>
            </div>

            <p className="mb-3 text-body-md text-content-variant">
              Escolha um ou mais funis. Os clientes desta lista que ainda não têm funil serão
              enviados para o <span className="text-content">primeiro funil selecionado</span>.
            </p>

            {msg && (
              <div className="mb-3 rounded-md border border-danger/40 bg-danger-container/30 px-4 py-2 text-label-md text-danger">
                {msg}
              </div>
            )}

            {funnels.length === 0 ? (
              <p className="text-body-md text-content-variant">
                Nenhum funil ativo. Crie um funil primeiro.
              </p>
            ) : (
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {funnels.map((f, i) => {
                  const checked = selected.includes(f.id);
                  const isPrimary = checked && selected[0] === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggle(f.id)}
                      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                        checked
                          ? "border-cyan-signal/50 bg-cyan-signal/10"
                          : "border-cyan-signal/15 hover:bg-surface-high"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          checked ? "border-transparent bg-cyan-signal text-surface" : "border-outline/50"
                        }`}
                      >
                        {checked && <Check size={13} />}
                      </span>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                      <span className="flex-1 text-body-md text-content">{f.name}</span>
                      {isPrimary && (
                        <span className="badge bg-primary-container text-primary">Principal</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={save} disabled={pending}>
                {pending && <Loader2 size={18} className="animate-spin" />}
                Salvar vínculos
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
