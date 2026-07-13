"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Bold, Italic, Strikethrough, Smile, Eraser } from "lucide-react";
import { createMessage } from "./actions";
import { renderTemplate } from "@/lib/utils";

const PREVIEW_CONTEXT: Record<string, string> = {
  nome: "Maria",
  nome_completo: "Maria Silva",
  telefone: "(51) 99999-8888",
  cidade: "Porto Alegre",
  empresa: "Sustentare",
  consultor: "João",
  produto: "Seguro Auto",
  valor: "R$ 1.200,00",
  funil: "Seguro Auto",
  etapa: "Primeiro contato",
  responsavel: "João",
  data: "13/07/2026",
  hora: "14:30",
  seguradora: "Porto Seguro",
  placa: "ABC1D23",
  modelo: "Onix",
  ano: "2022",
  renovacao: "Anual",
};

// Variáveis agrupadas com rótulos amigáveis.
const VARIABLE_GROUPS: { group: string; items: { key: string; label: string }[] }[] = [
  {
    group: "Cliente",
    items: [
      { key: "nome", label: "Primeiro nome" },
      { key: "nome_completo", label: "Nome completo" },
      { key: "telefone", label: "Telefone" },
      { key: "cidade", label: "Cidade" },
      { key: "empresa", label: "Empresa" },
    ],
  },
  {
    group: "Negócio",
    items: [
      { key: "produto", label: "Produto" },
      { key: "valor", label: "Valor" },
      { key: "seguradora", label: "Seguradora" },
      { key: "placa", label: "Placa" },
      { key: "modelo", label: "Modelo" },
      { key: "ano", label: "Ano" },
      { key: "renovacao", label: "Renovação" },
    ],
  },
  {
    group: "Contexto",
    items: [
      { key: "consultor", label: "Consultor" },
      { key: "responsavel", label: "Responsável" },
      { key: "funil", label: "Funil" },
      { key: "etapa", label: "Etapa" },
      { key: "data", label: "Data" },
      { key: "hora", label: "Hora" },
    ],
  },
];

const EMOJIS = ["😊", "👋", "✅", "📞", "🚗", "🏠", "💬", "🙏", "⭐", "📅", "💰", "🔔", "🎉", "👍"];

/** Converte marcação do WhatsApp para HTML (apenas para a pré-visualização). */
function whatsappToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*(.+?)\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~(.+?)~/g, "<del>$1</del>");
}

export function MessageEditor({ stages }: { stages: { id: string; label: string }[] }) {
  const router = useRouter();
  const [content, setContent] = useState(
    "Olá {nome}! 👋\nAqui é da *{empresa}* sobre seu {produto}.\nPodemos conversar?"
  );
  const [showEmoji, setShowEmoji] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function replaceRange(insert: string, selectInside = false, wrapLen = 0) {
    const el = textareaRef.current;
    if (!el) {
      setContent((c) => c + insert);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = content.slice(0, start) + insert + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = selectInside ? start + wrapLen : start + insert.length;
      el.selectionStart = el.selectionEnd = pos;
    });
  }

  function insertVariable(key: string) {
    replaceRange(`{${key}}`);
  }

  function insertEmoji(emoji: string) {
    replaceRange(emoji);
    setShowEmoji(false);
  }

  /** Envolve a seleção com um marcador do WhatsApp (*, _, ~). */
  function wrapSelection(mark: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || "texto";
    const next = content.slice(0, start) + mark + selected + mark + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + mark.length;
      el.selectionEnd = start + mark.length + selected.length;
    });
  }

  function submit(formData: FormData) {
    setError(null);
    formData.set("content", content);
    startTransition(async () => {
      const res = await createMessage(formData);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        router.refresh();
      } else {
        setError(res.error || "Erro ao salvar.");
      }
    });
  }

  const previewHtml = whatsappToHtml(renderTemplate(content, PREVIEW_CONTEXT));
  const charCount = content.length;

  return (
    <form action={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Coluna de edição */}
      <div className="card space-y-4 lg:col-span-3">
        <div className="flex items-center justify-between">
          <h2 className="text-title-md text-content">Nova mensagem</h2>
          <span className="text-label-sm text-outline">{charCount} caracteres</span>
        </div>

        {error && (
          <div className="rounded-md border border-danger/40 bg-danger-container/30 px-4 py-2 text-label-md text-danger">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="label">Título *</label>
            <input name="title" className="input" required placeholder="Boas-vindas" />
          </div>
          <div>
            <label className="label">Categoria</label>
            <input name="category" className="input" placeholder="1º contato" />
          </div>
          <div>
            <label className="label">Etapa vinculada</label>
            <select name="stageId" className="input" defaultValue="">
              <option value="">Nenhuma</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Conteúdo *</label>

          {/* Barra de formatação */}
          <div className="mb-2 flex flex-wrap items-center gap-1 rounded-md border border-cyan-signal/15 bg-surface-lowest p-1">
            <ToolbarButton onClick={() => wrapSelection("*")} title="Negrito (*texto*)">
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => wrapSelection("_")} title="Itálico (_texto_)">
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => wrapSelection("~")} title="Tachado (~texto~)">
              <Strikethrough size={16} />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-cyan-signal/20" />
            <div className="relative">
              <ToolbarButton onClick={() => setShowEmoji((s) => !s)} title="Emoji">
                <Smile size={16} />
              </ToolbarButton>
              {showEmoji && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
                  <div className="animate-fade-in absolute left-0 z-20 mt-1 grid w-56 grid-cols-7 gap-1 rounded-md border border-cyan-signal/20 bg-surface-container p-2 shadow-xl">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => insertEmoji(e)}
                        className="rounded p-1 text-lg hover:bg-surface-high"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <span className="mx-1 h-5 w-px bg-cyan-signal/20" />
            <ToolbarButton onClick={() => setContent("")} title="Limpar">
              <Eraser size={16} />
            </ToolbarButton>
          </div>

          <textarea
            ref={textareaRef}
            className="textarea min-h-[200px] text-body-md leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva a mensagem. Use os botões acima para formatar e inserir variáveis..."
          />
          <p className="mt-1 text-label-sm text-outline">
            Formatação do WhatsApp: <span className="text-content">*negrito*</span>,{" "}
            <span className="text-content">_itálico_</span>,{" "}
            <span className="text-content">~tachado~</span>.
          </p>
        </div>

        {/* Variáveis agrupadas */}
        <div>
          <p className="label">Inserir variável (clique para adicionar)</p>
          <div className="space-y-2">
            {VARIABLE_GROUPS.map((g) => (
              <div key={g.group}>
                <p className="mb-1 text-label-sm uppercase text-outline">{g.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      title={`Insere {${v.key}}`}
                      className="rounded-full border border-cyan-signal/25 px-2.5 py-1 text-label-sm text-secondary hover:bg-cyan-signal/10"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : saved ? (
              <Check size={18} />
            ) : null}
            {saved ? "Salvo!" : "Salvar mensagem"}
          </button>
        </div>
      </div>

      {/* Pré-visualização */}
      <div className="lg:col-span-2">
        <p className="label">Pré-visualização (WhatsApp)</p>
        <div
          className="rounded-lg p-4"
          style={{
            background:
              "linear-gradient(0deg, rgba(11,20,26,1) 0%, rgba(11,20,26,1) 100%)",
          }}
        >
          <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 shadow">
            <p
              className="whitespace-pre-wrap break-words text-body-md text-white [&_del]:line-through [&_em]:italic [&_strong]:font-bold"
              dangerouslySetInnerHTML={{ __html: previewHtml || "&nbsp;" }}
            />
            <span className="mt-1 block text-right text-[10px] text-white/60">14:30 ✓✓</span>
          </div>
        </div>
        <p className="mt-2 text-label-sm text-outline">
          Amostra com dados de exemplo. No envio, as variáveis são substituídas pelos dados reais
          do cliente. Ao vincular uma <span className="text-content">etapa</span>, esta mensagem
          passa a ser a mensagem padrão enviada naquela etapa do funil.
        </p>
      </div>
    </form>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded text-content-variant hover:bg-surface-high hover:text-content"
    >
      {children}
    </button>
  );
}
