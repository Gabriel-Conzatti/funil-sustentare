"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "./actions";
import { formatPhone } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

export function NewClientButton({
  funnels,
  origins,
  listId,
}: {
  funnels: Option[];
  origins: Option[];
  listId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");

  function submit(formData: FormData, force = false) {
    setError(null);
    setDuplicateId(null);
    if (force) formData.set("force", "true");
    startTransition(async () => {
      const res = await createClient(formData);
      if (res.ok) {
        setOpen(false);
        router.refresh();
        return;
      }
      if (res.duplicateId) {
        setDuplicateId(res.duplicateId);
        return;
      }
      setError(res.error || "Erro ao salvar.");
    });
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus size={18} /> Novo cliente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title-md text-content">Novo cliente</h2>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-danger/40 bg-danger-container/30 px-4 py-2 text-label-md text-danger">
                {error}
              </div>
            )}

            {duplicateId && (
              <div className="mb-4 rounded-md border border-tertiary/40 bg-tertiary-container/30 px-4 py-3">
                <p className="flex items-center gap-2 text-label-md text-tertiary">
                  <AlertTriangle size={16} /> Já existe um cliente semelhante cadastrado.
                </p>
                <div className="mt-2 flex gap-2">
                  <a href={`/clientes/${duplicateId}`} className="btn-secondary py-1 text-label-sm">
                    Abrir existente
                  </a>
                  <button
                    className="btn-ghost py-1 text-label-sm"
                    onClick={() => {
                      const form = document.getElementById("client-form") as HTMLFormElement;
                      submit(new FormData(form), true);
                    }}
                  >
                    Criar mesmo assim
                  </button>
                </div>
              </div>
            )}

            <form
              id="client-form"
              action={(fd) => submit(fd)}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {listId && <input type="hidden" name="listId" value={listId} />}
              <div className="sm:col-span-2">
                <label className="label">Nome completo *</label>
                <input name="fullName" className="input" required placeholder="Maria Silva" />
              </div>

              <div>
                <label className="label">Telefone / WhatsApp *</label>
                <input
                  name="phone"
                  className="input"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setPhone((p) => formatPhone(p))}
                  placeholder="(51) 99999-8888"
                />
              </div>

              <div>
                <label className="label">Funil</label>
                <select name="funnelId" className="input" defaultValue="">
                  <option value="">Sem funil (escolher depois)</option>
                  {funnels.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Origem</label>
                <select name="originId" className="input" defaultValue="">
                  <option value="">—</option>
                  {origins.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">E-mail</label>
                <input name="email" type="email" className="input" placeholder="maria@email.com" />
              </div>

              <div>
                <label className="label">CPF</label>
                <input name="cpf" className="input" placeholder="000.000.000-00" />
              </div>

              <div>
                <label className="label">Empresa</label>
                <input name="company" className="input" />
              </div>

              <div>
                <label className="label">Produto</label>
                <input name="product" className="input" placeholder="Seguro Auto" />
              </div>

              <div>
                <label className="label">Cidade</label>
                <input name="city" className="input" />
              </div>

              <div>
                <label className="label">Estado</label>
                <input name="state" className="input" maxLength={2} placeholder="RS" />
              </div>

              <div>
                <label className="label">Valor estimado</label>
                <input name="estimatedValue" className="input" placeholder="R$ 0,00" />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Observações</label>
                <textarea name="notes" className="textarea" />
              </div>

              <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={pending}>
                  {pending && <Loader2 size={18} className="animate-spin" />}
                  Salvar cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
