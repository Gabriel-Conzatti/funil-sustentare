"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Upload, ListPlus, FileSpreadsheet, FileUp } from "lucide-react";
import { createList, importClients } from "./actions";

interface Option {
  id: string;
  name: string;
}

export function ListActions({ funnels }: { funnels: Option[] }) {
  return (
    <div className="flex items-center gap-2">
      <ImportListButton funnels={funnels} />
      <NewListButton />
    </div>
  );
}

function NewListButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createList(formData);
      if (res.ok && res.id) {
        setOpen(false);
        router.push(`/clientes/${res.id}`);
        router.refresh();
      } else {
        setError(res.error || "Erro ao criar lista.");
      }
    });
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <ListPlus size={18} /> Nova lista
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in w-full max-w-lg rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title-md text-content">Nova lista de clientes</h2>
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
                <input name="name" className="input" required placeholder="Leads Feira 2026" />
              </div>
              <div>
                <label className="label">Observações</label>
                <textarea name="notes" className="textarea" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={pending}>
                  {pending && <Loader2 size={18} className="animate-spin" />}
                  Criar lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function ImportListButton({ funnels }: { funnels: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function countRows(text: string) {
    return text.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
  }

  async function handleFile(file: File) {
    setError(null);
    const name = file.name.toLowerCase();
    try {
      let text = "";
      if (name.endsWith(".csv") || name.endsWith(".txt")) {
        text = await file.text();
      } else {
        // .xlsx, .xls e outros formatos de planilha (SheetJS carregado sob demanda)
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet, { FS: ";" });
      }
      text = text.trim();
      if (!text) {
        setError("O arquivo está vazio.");
        return;
      }
      setData(text);
      setFileName(file.name);
      setRowCount(countRows(text));
    } catch {
      setError("Não foi possível ler o arquivo. Tente um .xlsx, .csv ou colar os dados.");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function closeImport() {
    setOpen(false);
    setData("");
    setFileName(null);
    setRowCount(0);
    setError(null);
  }

  function submit(formData: FormData) {
    setError(null);
    formData.set("data", data);
    startTransition(async () => {
      const res = await importClients(formData);
      if (res.ok && res.id) {
        closeImport();
        router.push(`/clientes/${res.id}`);
        router.refresh();
      } else {
        setError(res.error || "Erro ao importar.");
      }
    });
  }

  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        <Upload size={18} /> Importar lista
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title-md text-content">Importar lista de clientes</h2>
              <button onClick={closeImport} className="btn-ghost p-1">
                <X size={20} />
              </button>
            </div>
            {error && (
              <div className="mb-4 rounded-md border border-danger/40 bg-danger-container/30 px-4 py-2 text-label-md text-danger">
                {error}
              </div>
            )}
            <form action={submit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nome da lista *</label>
                  <input name="name" className="input" required placeholder="Importação Instagram" />
                </div>
                <div>
                  <label className="label">Funil de destino</label>
                  <select name="funnelId" className="input" defaultValue="">
                    <option value="">Sem funil (escolher depois)</option>
                    {funnels.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Planilha (arraste o arquivo ou clique)</label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
                    dragOver
                      ? "border-cyan-signal bg-cyan-signal/10"
                      : "border-cyan-signal/25 hover:border-cyan-signal/50 hover:bg-surface-high"
                  }`}
                >
                  {fileName ? (
                    <>
                      <FileSpreadsheet size={28} className="text-secondary" />
                      <p className="text-body-md text-content">{fileName}</p>
                      <p className="text-label-sm text-outline">{rowCount} linha(s) detectada(s)</p>
                    </>
                  ) : (
                    <>
                      <FileUp size={28} className="text-outline" />
                      <p className="text-body-md text-content-variant">
                        Arraste um arquivo <span className="text-content">.xlsx</span>,{" "}
                        <span className="text-content">.csv</span> ou clique para selecionar
                      </p>
                      <p className="text-label-sm text-outline">
                        Aceita qualquer modelo — basta ter as colunas de nome e telefone
                      </p>
                    </>
                  )}
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="label">Dados (ou cole aqui manualmente) *</label>
                <textarea
                  name="data"
                  value={data}
                  onChange={(e) => {
                    setData(e.target.value);
                    setRowCount(countRows(e.target.value));
                    setFileName(null);
                  }}
                  className="textarea min-h-[160px] font-mono text-label-md"
                  required
                  placeholder={"nome;telefone\nMaria Silva;51999998888\nCarlos Souza;51988887777"}
                />
                <p className="mt-1 text-label-sm text-outline">
                  Colunas reconhecidas automaticamente: nome e telefone (também email, cidade,
                  produto). O telefone pode vir sem parênteses ou traços. Linhas sem nome ou
                  telefone válido são ignoradas.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={closeImport}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={pending}>
                  {pending && <Loader2 size={18} className="animate-spin" />}
                  <Upload size={16} /> Importar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
