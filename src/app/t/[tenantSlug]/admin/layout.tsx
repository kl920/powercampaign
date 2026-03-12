import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTenantBySlug } from "@/lib/tenant";
import {
  BarChart3,
  Users,
  Settings,
  Download,
  Shield,
  ScrollText,
  Zap,
  Trophy,
} from "lucide-react";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await getSession();

  if (!session.userId) redirect(`/t/${tenantSlug}/auth/login`);
  if (session.role !== "TENANT_ADMIN" && session.role !== "SUPER_ADMIN") {
    redirect(`/t/${tenantSlug}/dashboard`);
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect("/");

  const navItems = [
    { href: `/t/${tenantSlug}/admin`, icon: BarChart3, label: "Oversigt" },
    { href: `/t/${tenantSlug}/admin/participants`, icon: Users, label: "Deltagere" },
    { href: `/t/${tenantSlug}/admin/connections`, icon: Zap, label: "Forbindelser" },
    { href: `/t/${tenantSlug}/admin/leaderboard`, icon: Trophy, label: "Rangliste" },
    { href: `/t/${tenantSlug}/admin/export`, icon: Download, label: "Eksport" },
    { href: `/t/${tenantSlug}/admin/consents`, icon: Shield, label: "Samtykker" },
    { href: `/t/${tenantSlug}/admin/audit`, icon: ScrollText, label: "Audit Log" },
    { href: `/t/${tenantSlug}/admin/settings`, icon: Settings, label: "Kampagne" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-sm lg:block">
        <div className="px-4 py-6">
          <Link
            href={`/t/${tenantSlug}/admin`}
            className="flex items-center gap-2 text-lg font-bold"
          >
            <Zap className="h-5 w-5 text-energy-blue" />
            {tenant.name}
          </Link>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>
        <nav className="space-y-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-energy-blue/10 hover:text-foreground transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
