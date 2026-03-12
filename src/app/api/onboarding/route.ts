import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { db } from "@/lib/db";
import { onboardingHouseholdSchema } from "@/lib/validation";
import { connectDemoHousehold, generateConsumptionData } from "@/server/demo-provider";
import { calculateAllBaselines } from "@/server/baseline";
import { scoreAllHouseholds } from "@/server/scoring";
import { rebuildGlobalLeaderboard } from "@/server/leaderboard";
import type { HousingType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const parsed = onboardingHouseholdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { postalCode, housingType, householdSize, floorAreaM2, movedInAt } =
      parsed.data;

    const result = await db.$transaction(async (tx) => {
      // Create household
      const household = await tx.household.create({
        data: {
          tenantId: session.tenantId,
          ownerUserId: session.userId,
          postalCode,
          housingType: housingType as HousingType,
          householdSize,
          floorAreaM2: floorAreaM2 ?? null,
          movedInAt: movedInAt ? new Date(movedInAt) : null,
        },
      });

      // Create household member
      await tx.householdMember.create({
        data: {
          householdId: household.id,
          userId: session.userId,
          roleLabel: "Ejer",
        },
      });

      // Data access consent
      await tx.consentRecord.create({
        data: {
          userId: session.userId,
          tenantId: session.tenantId,
          consentType: "DATA_ACCESS",
          version: "1.0",
          accepted: true,
          acceptedAt: new Date(),
        },
      });

      return household;
    });

    // Connect demo data (outside transaction for the demo-provider calls)
    const { meterPoint } = await connectDemoHousehold(result.id);

    // Find active campaign for this tenant
    const campaign = await db.campaign.findFirst({
      where: {
        tenantId: session.tenantId,
        status: { in: ["LIVE", "COMPLETED", "SCHEDULED"] },
      },
      orderBy: { startsAt: "desc" },
    });

    if (campaign) {
      await generateConsumptionData({
        householdId: result.id,
        meterPointId: meterPoint.id,
        housingType: housingType as HousingType,
        householdSize,
        floorAreaM2: floorAreaM2 ?? 80,
        weeksOfHistory: 8,
        challengeStartDate: campaign.startsAt,
        challengeDays: 7,
        savingFactor: 0.05 + Math.random() * 0.2, // 5-25% saving
        seed: Date.now(),
      });
    }

    // Mark onboarding completed
    await db.user.update({
      where: { id: session.userId },
      data: { onboardingCompletedAt: new Date() },
    });

    // Calculate baseline, score and leaderboard immediately so the
    // dashboard shows real numbers on the very first visit.
    if (campaign) {
      try {
        await calculateAllBaselines(campaign.id);
        await scoreAllHouseholds(campaign.id);
        await rebuildGlobalLeaderboard(campaign.id);
      } catch (scoringError) {
        // Non-fatal: user can still see the dashboard, scores will be
        // recalculated on the next admin recalculate or nightly job.
        console.error("Scoring after onboarding failed:", scoringError);
      }
    }

    return NextResponse.json({ householdId: result.id }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
