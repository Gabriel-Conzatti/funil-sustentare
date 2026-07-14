"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  Loader2,
  Pencil,
  KeyRound,
  Ban,
  CheckCircle2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { createUser, updateUser, setUserStatus, resetPassword, deleteUser } from "./actions";
import { USER_ROLES, USER_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export interface UserRow {
  id: string;
  name: string;
  lastName: string | null;
  fullName: string;
  email: string;
  username: string;
  role: string;
  status: string;
  phone: string | null;
  whatsapp: string | null;
  jobTitle: string | null;
  color: string;
  notes: string | null;
  clientCount: number;
  lastLoginAt: string | null;
}

const STATUS_TINT: Record<string, string> = {
  ATIVO: "bg-primary-container text-primary",
  INATIVO: "bg-surface-high text-content-variant",
  BLOQUEADO: "bg-danger-container/30 text-danger",
  FERIAS: "bg-tertiary-container/30 text-tertiary",
  DESLIGADO: "bg-surface-high text-outline",
};

export function UsersManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [resetting, setResetting] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resetPwd, setResetPwd] = useState("");

  function refresh() {
    router.refresh();
  }

  function openCreate() {
    setEditing(null);
    setError(null);
    setFormOpen(true);
  }
  function openEdit(u: UserRow) {
    setEditing(u);
    setError(null);
    setFormOpen(true);
    setMenuId(null);
  }

  function submitForm(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = editing ? await updateUser(editing.id, formData) : await createUser(formData);
      if (res.ok) {
        setFormOpen(false);
        refresh();
      } else {
        setError(res.error || "Erro ao salvar.");
      }
    });
  }

  function toggleStatus(u: UserRow) {
    setMenuId(null);
    const next = u.status === "BLOQUEADO" || u.status === "INATIVO" ? "ATIVO" : "BLOQUEADO";
    startTransition(async () => {
      await setUserStatus(u.id, next);
      refresh();
    });
  }

  function submitReset() {
    if (!resetting) return;
    setError(null);
    startTransition(async () => {
      const res = await resetPassword(resetting.id, resetPwd);
      if (res.ok) {
        setResetting(null);
        setResetPwd("");
        refresh();
      } else {
        setError(res.error || "Erro ao redefinir senha.");
      }
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      await deleteUser(deleting.id);
      setDeleting(null);
      refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={18} /> Novo usuário
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr className="border-b border-cyan-signal/15 text-label-sm uppercase text-outline">
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Clientes</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Último login</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-cyan-signal/10 hover:bg-surface-high">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-label-sm font-semibold text-surface"
                      style={{ backgroundColor: u.color }}
                    >
                      {u.name[0]?.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-body-md text-content">
                        {u.fullName}
                        {u.id === currentUserId && (
                          <span className="ml-2 rounded-full bg-secondary-container/30 px-2 text-label-sm text-secondary">
                            você
                          </span>
                        )}
                      </p>
                      <p className="text-label-sm text-outline">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-content-variant">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-primary-container text-primary">{u.role}</span>
                </td>
                <td className="px-4 py-3 text-content-variant">{u.clientCount}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_TINT[u.status] || ""}`}>{u.status}</span>
                </td>
                <td className="px-4 py-3 text-label-sm text-outline">
                  {formatDateTime(u.lastLoginAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="relative flex justify-end">
                    <button
                      className="btn-ghost p-1.5"
                      onClick={() => setMenuId(menuId === u.id ? null : u.id)}
                    >
                      <MoreVertical size={18} />
                    </button>
                    {menuId === u.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                        <div className="animate-fade-in absolute right-0 top-9 z-20 w-52 rounded-lg border border-cyan-signal/20 bg-surface-container p-1 shadow-xl">
                          <button
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-label-md text-content-variant hover:bg-surface-high"
                            onClick={() => openEdit(u)}
                          >
                            <Pencil size={15} /> Editar
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-label-md text-content-variant hover:bg-surface-high"
                            onClick={() => {
                              setResetting(u);
                              setResetPwd("");
                              setError(null);
                              setMenuId(null);
                            }}
                          >
                            <KeyRound size={15} /> Redefinir senha
                          </button>
                          {u.id !== currentUserId && (
                            <>
                              <button
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-label-md text-content-variant hover:bg-surface-high"
                                onClick={() => toggleStatus(u)}
                              >
                                {u.status === "BLOQUEADO" || u.status === "INATIVO" ? (
                                  <>
                                    <CheckCircle2 size={15} /> Ativar
                                  </>
                                ) : (
                                  <>
                                    <Ban size={15} /> Bloquear
                                  </>
                                )}
                              </button>
                              <button
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-label-md text-danger hover:bg-danger-container/20"
                                onClick={() => {
                                  setDeleting(u);
                                  setMenuId(null);
                                }}
                              >
                                <Trash2 size={15} /> Remover
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal criar/editar */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title-md text-content">
                {editing ? "Editar usuário" : "Novo usuário"}
              </h2>
              <button onClick={() => setFormOpen(false)} className="btn-ghost p-1">
                <X size={20} />
              </button>
            </div>
            {error && (
              <div className="mb-4 rounded-md border border-danger/40 bg-danger-container/30 px-4 py-2 text-label-md text-danger">
                {error}
              </div>
            )}
            <form action={submitForm} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nome *</label>
                <input name="name" className="input" required defaultValue={editing?.name || ""} />
              </div>
              <div>
                <label className="label">Sobrenome</label>
                <input name="lastName" className="input" defaultValue={editing?.lastName || ""} />
              </div>
              <div>
                <label className="label">E-mail *</label>
                <input name="email" type="email" className="input" required defaultValue={editing?.email || ""} />
              </div>
              <div>
                <label className="label">Usuário (login) *</label>
                <input name="username" className="input" required defaultValue={editing?.username || ""} />
              </div>
              {!editing && (
                <div>
                  <label className="label">Senha *</label>
                  <input name="password" type="password" className="input" required autoComplete="new-password" />
                </div>
              )}
              <div>
                <label className="label">Cargo</label>
                <input name="jobTitle" className="input" defaultValue={editing?.jobTitle || ""} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input name="phone" className="input" defaultValue={editing?.phone || ""} />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input name="whatsapp" className="input" defaultValue={editing?.whatsapp || ""} />
              </div>
              <div>
                <label className="label">Perfil</label>
                <select
                  name="role"
                  className="input"
                  defaultValue={editing?.role || "USER"}
                  disabled={editing?.id === currentUserId}
                >
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  name="status"
                  className="input"
                  defaultValue={editing?.status || "ATIVO"}
                  disabled={editing?.id === currentUserId}
                >
                  {USER_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="label mb-0">Cor</label>
                <input name="color" type="color" defaultValue={editing?.color || "#a8c8ff"} className="h-9 w-16 rounded bg-transparent" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Observações</label>
                <textarea name="notes" className="textarea" defaultValue={editing?.notes || ""} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setFormOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={pending}>
                  {pending && <Loader2 size={18} className="animate-spin" />}
                  {editing ? "Salvar alterações" : "Criar usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal redefinir senha */}
      {resetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in w-full max-w-md rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title-md text-content">Redefinir senha · {resetting.name}</h2>
              <button onClick={() => setResetting(null)} className="btn-ghost p-1">
                <X size={20} />
              </button>
            </div>
            {error && (
              <div className="mb-4 rounded-md border border-danger/40 bg-danger-container/30 px-4 py-2 text-label-md text-danger">
                {error}
              </div>
            )}
            <label className="label">Nova senha</label>
            <input
              type="text"
              className="input"
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
              placeholder="Mínimo 8 caracteres, com letra e número"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setResetting(null)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={submitReset} disabled={pending}>
                {pending && <Loader2 size={18} className="animate-spin" />}
                Redefinir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar remoção */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="animate-scale-in w-full max-w-md rounded-lg border border-cyan-signal/20 bg-surface-container p-6">
            <h2 className="mb-2 text-title-md text-content">Remover usuário</h2>
            <p className="text-body-md text-content-variant">
              Deseja remover <span className="text-content">{deleting.fullName}</span>? O usuário
              perde o acesso, mas o histórico é preservado.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setDeleting(null)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={confirmDelete} disabled={pending}>
                {pending && <Loader2 size={18} className="animate-spin" />}
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
