"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { createFunnel } from "./actions";

export function NewFunnelButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createFunnel(formData);
      if (res.ok && res.id) {
        setOpen(false);
        router.push(`/funis/${res.id}`);
        router.refresh();
      } else {
        setError(res.error || "Erro ao criar funil.");
      }
    });
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus size={18} /> Novo funil
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in w-full max-w-lg rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title-md text-content">Novo funil</h2>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-danger/40 bg-danger-container/30 px-4 py-2 text-label-md text-danger">
                {error}
              </div>
            )}

            <form action={submit} className="space-y-4">
              <div>
                <label className="label">Nome *</label>
                <input name="name" className="input" required placeholder="Seguro Auto" />
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea name="description" className="textarea" />
              </div>
              <div className="flex items-center gap-3">
                <label className="label mb-0">Cor</label>
                <input name="color" type="color" defaultValue="#00cbff" className="h-9 w-16 rounded bg-transparent" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={pending}>
                  {pending && <Loader2 size={18} className="animate-spin" />}
                  Criar funil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
