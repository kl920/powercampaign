import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter: new PrismaPg(pool) });

const u = await p.user.findUnique({ where: { email: "anna0@demo.dk" } });
console.log("user:", u?.id, u?.name);

const h = await p.household.findFirst({ where: { ownerUserId: u!.id } });
console.log("household:", h?.id);

const b = await p.baselineSnapshot.findFirst({ where: { householdId: h!.id } });
console.log("baseline kWh:", b?.baselineKwh?.toString(), "| limited:", b?.limitedBaseline);

const cr = await p.challengeResult.findFirst({ where: { householdId: h!.id } });
console.log("savingKwh:", cr?.savingKwh?.toString(), "| savingPct:", cr?.savingPercent?.toString());

const cnt = await p.consumptionInterval.count({ where: { householdId: h!.id } });
console.log("intervals:", cnt);

await pool.end();
