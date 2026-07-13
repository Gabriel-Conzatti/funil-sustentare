import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getStaleClients } from "@/lib/alerts";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const alerts = await getStaleClients();

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar role={user.role} />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <Header
          user={user}
          alerts={{
            count: alerts.count,
            hours: alerts.hours,
            items: alerts.items.map((i) => ({
              id: i.id,
              fullName: i.fullName,
              updatedAt: i.updatedAt.toISOString(),
              funnelId: i.funnelId,
              listId: i.listId,
            })),
          }}
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
