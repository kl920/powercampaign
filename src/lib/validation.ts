import { z } from "zod/v4";

export const registerSchema = z.object({
  name: z.string().min(2, "Navn skal være mindst 2 tegn").max(100),
  email: z.email("Ugyldig e-mail"),
  password: z
    .string()
    .min(8, "Adgangskode skal være mindst 8 tegn")
    .max(128),
  tenantSlug: z.string().min(1),
  acceptTerms: z.literal(true, "Du skal acceptere vilkårene"),
  marketingConsent: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.email("Ugyldig e-mail"),
  password: z.string().min(1, "Adgangskode er påkrævet"),
  tenantSlug: z.string().min(1),
});

export const onboardingHouseholdSchema = z.object({
  postalCode: z
    .string()
    .regex(/^\d{4}$/, "Postnummer skal være 4 cifre"),
  housingType: z.enum(["APARTMENT", "HOUSE", "TOWNHOUSE", "OTHER"]),
  householdSize: z.number().int().min(1).max(20),
  floorAreaM2: z.number().int().min(10).max(1000).optional(),
  movedInAt: z.iso.date().optional(),
});

export const consentSchema = z.object({
  consentType: z.enum(["PARTICIPATION", "DATA_ACCESS", "MARKETING"]),
  granted: z.boolean(),
});
