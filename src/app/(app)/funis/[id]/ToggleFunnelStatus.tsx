"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff, Loader2 } from "lucide-react";
import { toggleFunnelStatus } from "../actions";

export function ToggleFunnelStatus({
  funnelId,
  status,
}: {
  funnelId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(status);
  const active = current === "ATIVO";

  function toggle() {
    startTransition(async () => {
      const res = await toggleFunnelStatus(funnelId);
      if (res.ok && res.status) {
        setCurrent(res.status);
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={active ? "btn-ghost" : "btn-secondary"}
      title={active ? "Desativar funil" : "Ativar funil"}
    >
      {pending ? (
        <Loader2 size={18} className="animate-spin" />
      ) : active ? (
        <PowerOff size={18} />
      ) : (
        <Power size={18} />
      )}
      {active ? "Desativar" : "Ativar"}
    </button>
  );
}
