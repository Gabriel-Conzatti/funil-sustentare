import { NextResponse } from "next/server";
import { clearAuthCookies, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await audit({ userId: user.id, entity: "Auth", action: "LOGOUT", description: "Logout" });
  }
  clearAuthCookies();
  return NextResponse.json({ ok: true });
}
