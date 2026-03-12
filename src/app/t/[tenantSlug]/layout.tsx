import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) notFound();

  const primaryColor = tenant.branding?.primaryColor ?? "#0F766E";

  return (
    <div
      className="min-h-screen"
      style={{ "--tenant-primary": primaryColor } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
