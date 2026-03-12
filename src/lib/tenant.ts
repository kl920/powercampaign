import { cache } from "react";
import { db } from "./db";

export const getTenantBySlug = cache(async (slug: string) => {
  return db.tenant.findUnique({
    where: { slug, status: "ACTIVE" },
    include: { branding: true },
  });
});

export type TenantWithBranding = NonNullable<
  Awaited<ReturnType<typeof getTenantBySlug>>
>;

/** Extract tenantSlug from a /t/[tenantSlug]/... path */
export function extractTenantSlug(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([^/]+)/);
  return match ? match[1] : null;
}
