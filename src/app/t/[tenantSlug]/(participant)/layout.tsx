import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTenantBySlug } from "@/lib/tenant";
import { BarChart3, Trophy, User, LogOut, Zap } from "lucide-react";

export default async function ParticipantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await getSession();

  if (!session.userId) {
    redirect(`/t/${tenantSlug}/auth/login`);
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect("/");

  const navItems = [
    { href: `/t/${tenantSlug}/dashboard`, icon: BarChart3, label: "Dashboard" },
    { href: `/t/${tenantSlug}/leaderboard`, icon: Trophy, label: "Rangliste" },
    { href: `/t/${tenantSlug}/profile`, icon: User, label: "Profil" },
  ];

  return (
    <div className="min-h-screen">
      <nav className="glass sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href={`/t/${tenantSlug}/dashboard`}
            className="flex items-center gap-2 font-bold"
          >
            <Zap className="h-4 w-4 text-energy-green" />
            {tenant.name}
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log ud</span>
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
