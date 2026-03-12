import { NextResponse } from "next/server";
import { requireAuth, getSession, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const session = await requireAuth();

    // Soft delete user and their households
    await db.$transaction(async (tx) => {
      const now = new Date();

      await tx.user.update({
        where: { id: session.userId },
        data: { deletedAt: now },
      });

      await tx.household.updateMany({
        where: { ownerUserId: session.userId },
        data: { deletedAt: now },
      });

      // Revoke all meter connections
      await tx.meterConnection.updateMany({
        where: { household: { ownerUserId: session.userId } },
        data: { status: "REVOKED", consentRevokedAt: now },
      });

      // Audit
      await tx.auditLog.create({
        data: {
          tenantId: session.tenantId,
          actorUserId: session.userId,
          action: "ACCOUNT_DELETED",
          entityType: "User",
          entityId: session.userId,
        },
      });
    });

    // Destroy session
    const activeSession = await getSession();
    activeSession.destroy();

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
