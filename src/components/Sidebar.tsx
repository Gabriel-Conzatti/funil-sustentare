"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Filter,
  MessageSquare,
  History,
  UserCog,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/funis", label: "Funis", icon: Filter },
  { href: "/mensagens", label: "Mensagens", icon: MessageSquare, adminOnly: true },
  { href: "/usuarios", label: "Usuários", icon: UserCog, adminOnly: true },
  { href: "/auditoria", label: "Auditoria", icon: History, adminOnly: true },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = role === "ADMIN";
  const navItems = NAV.filter((item) => isAdmin || !item.adminOnly);

  return (
    <>
      {/* Botão mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-md border border-cyan-signal/20 bg-surface-container p-2 text-content lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-cyan-signal/15 bg-surface-container-low transition-all duration-200 lg:static",
          collapsed ? "w-[72px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-cyan-signal/15 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-container">
            <span className="font-bold text-primary">F</span>
          </div>
          {!collapsed && (
            <span className="truncate text-title-md text-content">Funil Sustentare</span>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-label-md transition-colors",
                  active
                    ? "bg-primary-container text-primary"
                    : "text-content-variant hover:bg-surface-high hover:text-content",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden items-center gap-3 border-t border-cyan-signal/15 px-4 py-3 text-label-md text-content-variant hover:text-content lg:flex"
        >
          <ChevronLeft size={20} className={cn("transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Recolher</span>}
        </button>
      </aside>
    </>
  );
}
