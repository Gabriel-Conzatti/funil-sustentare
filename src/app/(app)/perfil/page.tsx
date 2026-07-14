import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Meu perfil"
        subtitle="Seus dados e segurança da conta"
        crumbs={[{ label: "Meu perfil" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card max-w-md space-y-3">
          <h2 className="text-title-md text-content">Dados da conta</h2>
          <div className="space-y-2 text-body-md">
            <div className="flex justify-between border-b border-cyan-signal/10 pb-2">
              <span className="text-content-variant">Nome</span>
              <span className="text-content">{user.fullName}</span>
            </div>
            <div className="flex justify-between border-b border-cyan-signal/10 pb-2">
              <span className="text-content-variant">Usuário</span>
              <span className="text-content">{user.username}</span>
            </div>
            <div className="flex justify-between border-b border-cyan-signal/10 pb-2">
              <span className="text-content-variant">E-mail</span>
              <span className="text-content">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-variant">Perfil</span>
              <span className="rounded-full bg-primary-container px-2 py-0.5 text-label-sm text-primary">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
