"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle } from "lucide-react";
import type { StaleClient } from "@/lib/alerts";

function ageLabel(updatedAt: string): string {
  const ms = Date.now() - new Date(updatedAt).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}

interface AlertItem {
  id: string;
  fullName: string;
  updatedAt: string;
  funnelId: string | null;
  listId: string | null;
}

export function AlertsBell({
  count,
  hours,
  items,
}: {
  count: number;
  hours: number;
  items: AlertItem[];
}) {
  const [open, setOpen] = useState(false);

  function targetHref(a: AlertItem): string {
    if (a.funnelId) return `/funis/${a.funnelId}`;
    if (a.listId) return `/clientes/${a.listId}`;
    return `/clientes?q=${encodeURIComponent(a.fullName)}`;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-content-variant hover:bg-surface-high hover:text-content"
        title={`${count} cliente(s) sem atualização há +${hours}h`}
        aria-label="Alertas"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="animate-fade-in absolute right-0 z-20 mt-2 w-80 rounded-lg border border-cyan-signal/20 bg-surface-container p-1 shadow-xl">
            <div className="flex items-center gap-2 border-b border-cyan-signal/15 px-3 py-2">
              <AlertTriangle size={16} className="text-accent" />
              <p className="text-label-md text-content">
                Sem atualização há +{hours}h
              </p>
              <span className="ml-auto rounded-full bg-accent/20 px-2 text-label-sm text-accent">
                {count}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-label-md text-content-variant">
                Nenhum cliente parado. 🎉
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto py-1">
                {items.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={targetHref(a)}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-surface-high"
                    >
                      <span className="truncate text-label-md text-content">{a.fullName}</span>
                      <span className="shrink-0 text-label-sm text-accent">
                        {ageLabel(a.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {count > items.length && (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block border-t border-cyan-signal/15 px-3 py-2 text-center text-label-sm text-secondary hover:underline"
              >
                Ver todos no dashboard
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
