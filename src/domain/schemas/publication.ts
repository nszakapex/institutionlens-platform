import { z } from "zod";
import { PublicationEligibilitySchema } from "@/domain/schemas/assessment";

export const PublicationPolicySchema = z.object({
  defaultEligibility: PublicationEligibilitySchema,
  allowInferencePublication: z.literal(false),
  requireProvenanceForVerified: z.literal(true),
  unknownLicenseBlocksPublication: z.literal(true),
});

export type PublicationPolicy = z.infer<typeof PublicationPolicySchema>;

export const DEFAULT_PUBLICATION_POLICY: PublicationPolicy = {
  defaultEligibility: "internal_only",
  allowInferencePublication: false,
  requireProvenanceForVerified: true,
  unknownLicenseBlocksPublication: true,
};
