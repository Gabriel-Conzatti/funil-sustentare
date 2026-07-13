"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, User as UserIcon, ChevronDown, Search } from "lucide-react";
import type { SessionUser } from "@/lib/types";
import { AlertsBell } from "./AlertsBell";

interface AlertItem {
  id: string;
  fullName: string;
  updatedAt: string;
  funnelId: string | null;
  listId: string | null;
}

export function Header({
  user,
  alerts,
}: {
  user: SessionUser;
  alerts: { count: number; hours: number; items: AlertItem[] };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    router.push(`/clientes?q=${encodeURIComponent(term)}`);
  }

  const initials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-cyan-signal/15 bg-surface-container-low/80 px-4 backdrop-blur lg:px-6">
      <form onSubmit={onSearch} className="relative ml-10 max-w-md flex-1 lg:ml-0">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente..."
          className="input h-10 pl-10"
          aria-label="Busca global de clientes"
        />
      </form>

      <div className="flex items-center gap-1">
        <AlertsBell count={alerts.count} hours={alerts.hours} items={alerts.items} />

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-high"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-label-md font-semibold text-primary">
              {initials}
            </span>
            <span className="hidden text-label-md text-content sm:block">{user.name}</span>
            <ChevronDown size={16} className="text-outline" />
          </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="animate-fade-in absolute right-0 z-20 mt-2 w-56 rounded-lg border border-cyan-signal/20 bg-surface-container p-1 shadow-xl">
              <div className="border-b border-cyan-signal/15 px-3 py-2">
                <p className="truncate text-label-md text-content">{user.fullName}</p>
                <p className="truncate text-label-sm text-outline">{user.email}</p>
                <span className="mt-1 inline-block rounded-full bg-primary-container px-2 py-0.5 text-label-sm text-primary">
                  {user.role}
                </span>
              </div>
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-label-md text-content-variant hover:bg-surface-high">
                <UserIcon size={16} /> Meu perfil
              </button>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-label-md text-danger hover:bg-danger-container/20"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </header>
  );
}
