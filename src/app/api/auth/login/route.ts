import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { audit } from "@/lib/audit";
import { headers } from "next/headers";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  let body: { identifier?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const identifier = (body.identifier || "").trim();
  const password = body.password || "";

  if (!identifier || !password) {
    return NextResponse.json({ error: "Informe usuário e senha." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ username: identifier }, { email: identifier.toLowerCase() }],
    },
  });

  const genericError = NextResponse.json(
    { error: "Usuário ou senha inválidos." },
    { status: 401 }
  );

  if (!user) return genericError;

  if (user.status === "BLOQUEADO") {
    return NextResponse.json(
      { error: "Usuário bloqueado. Contate o administrador." },
      { status: 403 }
    );
  }
  if (user.status !== "ATIVO") {
    return NextResponse.json(
      { error: "Usuário não está ativo." },
      { status: 403 }
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const attempts = user.loginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: attempts,
        status: attempts >= MAX_ATTEMPTS ? "BLOQUEADO" : user.status,
      },
    });
    await audit({
      userId: user.id,
      entity: "Auth",
      action: "LOGIN_FALHA",
      description: `Tentativa inválida (${attempts}/${MAX_ATTEMPTS})`,
    });
    return genericError;
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    username: user.username,
  };

  const access = await signAccessToken(sessionUser);
  const refresh = await signRefreshToken(user.id);
  setAuthCookies(access, refresh);

  const h = headers();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lastLoginAt: new Date() },
    }),
    prisma.session.create({
      data: {
        userId: user.id,
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined,
        userAgent: h.get("user-agent") || undefined,
        refreshToken: refresh,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  await audit({ userId: user.id, entity: "Auth", action: "LOGIN", description: "Login realizado" });

  return NextResponse.json({ user: sessionUser });
}
