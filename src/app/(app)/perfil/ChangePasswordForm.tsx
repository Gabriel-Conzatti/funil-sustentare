"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Check, KeyRound } from "lucide-react";
import { changePassword } from "./actions";

export function ChangePasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [show, setShow] = useState(false);

  function submit(formData: FormData) {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const res = await changePassword(formData);
      if (res.ok) {
        setOk(true);
        const form = document.getElementById("pwd-form") as HTMLFormElement | null;
        form?.reset();
        router.refresh();
      } else {
        setError(res.error || "Erro ao trocar a senha.");
      }
    });
  }

  return (
    <form id="pwd-form" action={submit} className="card max-w-md space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-container text-primary">
          <KeyRound size={18} />
        </span>
        <h2 className="text-title-md text-content">Trocar senha</h2>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger-container/30 px-4 py-2 text-label-md text-danger">
          {error}
        </div>
      )}
      {ok && (
        <div className="flex items-center gap-2 rounded-md border border-secondary/40 bg-secondary-container/20 px-4 py-2 text-label-md text-secondary">
          <Check size={16} /> Senha alterada com sucesso!
        </div>
      )}

      <div>
        <label className="label">Senha atual</label>
        <input name="current" type={show ? "text" : "password"} className="input" required autoComplete="current-password" />
      </div>
      <div>
        <label className="label">Nova senha</label>
        <input name="next" type={show ? "text" : "password"} className="input" required autoComplete="new-password" />
        <p className="mt-1 text-label-sm text-outline">
          Mínimo 8 caracteres, com ao menos uma letra e um número.
        </p>
      </div>
      <div>
        <label className="label">Confirmar nova senha</label>
        <input name="confirm" type={show ? "text" : "password"} className="input" required autoComplete="new-password" />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-label-md text-content-variant">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-4 w-4 accent-cyan-signal" />
        Mostrar senhas
      </label>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 size={18} className="animate-spin" /> : null}
          Salvar nova senha
        </button>
      </div>
    </form>
  );
}
