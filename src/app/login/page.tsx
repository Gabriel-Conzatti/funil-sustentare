"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao entrar.");
        return;
      }
      if (remember) localStorage.setItem("fs_last_user", identifier);
      const next = params.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary-container/30 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-signal/10 blur-3xl" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="animate-scale-in relative w-full max-w-md rounded-xl border border-cyan-signal/20 bg-surface-container p-8 shadow-2xl shadow-black/40"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary-container">
            <span className="text-headline-lg font-bold text-primary">F</span>
          </div>
          <h1 className="text-headline-lg text-content">Funil Sustentare</h1>
          <p className="mt-1 text-body-md text-content-variant">Acesse sua conta comercial</p>
        </div>

        {error && (
          <div className="animate-fade-in mb-4 rounded-md border border-danger/40 bg-danger-container/30 px-4 py-3 text-label-md text-danger">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="label" htmlFor="identifier">
            Usuário ou e-mail
          </label>
          <input
            id="identifier"
            className="input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="admin"
            autoComplete="username"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="label" htmlFor="password">
            Senha
          </label>
          <div className="relative">
            <input
              id="password"
              type={show ? "text" : "password"}
              className="input pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-content"
              aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between text-label-md">
          <label className="flex cursor-pointer items-center gap-2 text-content-variant">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-cyan-signal"
            />
            Lembrar usuário
          </label>
          <button type="button" className="text-secondary hover:underline">
            Esqueci minha senha
          </button>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="mt-6 text-center text-label-sm text-outline">
          Acesso restrito · Todas as ações são auditadas
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-surface text-content-variant">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
