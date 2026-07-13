import { type ClassValue } from "./types";

/** Concatena classes condicionais (utilitário leve, sem dependências). */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const item of inputs) {
    if (!item) continue;
    if (typeof item === "string" || typeof item === "number") {
      out.push(String(item));
    } else if (Array.isArray(item)) {
      out.push(cn(...item));
    } else if (typeof item === "object") {
      for (const [key, value] of Object.entries(item)) {
        if (value) out.push(key);
      }
    }
  }
  return out.join(" ");
}

/**
 * Formata telefone brasileiro removendo caracteres inválidos e aplicando máscara.
 * Ex.: "51999998888" -> "(51) 99999-8888"
 */
export function formatPhone(raw: string): string {
  const digits = onlyDigits(raw);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

export function onlyDigits(raw: string): string {
  return (raw || "").replace(/\D+/g, "");
}

/** Extrai o DDD de um telefone. */
export function extractDDD(raw: string): string | null {
  const digits = onlyDigits(raw);
  return digits.length >= 10 ? digits.slice(0, 2) : null;
}

/** Monta um link wa.me com a mensagem já codificada. */
export function buildWaMeLink(phone: string, message: string): string {
  const digits = onlyDigits(phone);
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

/**
 * Substitui variáveis {chave} de uma mensagem por valores de um contexto.
 * Tolerante a maiúsculas/minúsculas e espaços: {Nome}, { nome }, {NOME} funcionam.
 * Com blankMissing=true, variáveis sem valor viram string vazia (útil no envio);
 * caso contrário, mantém o texto {chave} (útil na pré-visualização/edição).
 */
export function renderTemplate(
  content: string,
  context: Record<string, string | number | null | undefined>,
  opts?: { blankMissing?: boolean }
): string {
  return content.replace(/\{\s*(\w+)\s*\}/g, (_match, rawKey: string) => {
    const value = context[rawKey.toLowerCase()];
    if (value === undefined || value === null || value === "") {
      return opts?.blankMissing ? "" : `{${rawKey}}`;
    }
    return String(value);
  });
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
