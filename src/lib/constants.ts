// Constantes "enum-like" — evitam valores fixos espalhados pelo código.

export const USER_ROLES = ["ADMIN", "USER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUS = ["ATIVO", "INATIVO", "BLOQUEADO", "FERIAS", "DESLIGADO"] as const;

export const CLIENT_STATUS = ["ATIVO", "ARQUIVADO", "PERDIDO", "CONVERTIDO", "CANCELADO"] as const;
export type ClientStatus = (typeof CLIENT_STATUS)[number];

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  ATIVO: "Ativo",
  ARQUIVADO: "Arquivado",
  PERDIDO: "Perdido",
  CONVERTIDO: "Convertido",
  CANCELADO: "Cancelado",
};

export const HISTORY_TYPES = [
  "CRIADO",
  "MENSAGEM",
  "MOVIMENTACAO",
  "RESPONSAVEL",
  "VENDA",
  "PERDA",
  "OBSERVACAO",
  "TAG",
  "ARQUIVADO",
  "RESTAURADO",
] as const;

export const LOST_REASONS = [
  "Preço",
  "Sem interesse",
  "Concorrência",
  "Cliente desistiu",
  "Não respondeu",
  "Contato inválido",
  "Outro",
] as const;

export const DEFAULT_ORIGINS = [
  "Google",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Indicação",
  "Site",
  "Campanha",
  "Feira",
  "Ligação",
  "Presencial",
  "Outro",
] as const;

// Variáveis suportadas no editor de mensagens.
export const MESSAGE_VARIABLES = [
  "nome",
  "telefone",
  "cidade",
  "empresa",
  "consultor",
  "produto",
  "valor",
  "funil",
  "etapa",
  "responsavel",
  "data",
  "hora",
  "seguradora",
  "placa",
  "modelo",
  "ano",
  "renovacao",
] as const;
