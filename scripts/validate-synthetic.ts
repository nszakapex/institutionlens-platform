import { assertEvidenceInvariants, assertOrganizationFitUnassessed } from "@/domain/invariants";
import { financialInstitutionsAdapter } from "@/verticals/financial-institutions/adapter";
import { FinancialInstitutionPayloadSchema } from "@/verticals/financial-institutions/schema";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function main(): void {
  const fixtures = financialInstitutionsAdapter.loadSyntheticFixtures();
  const provenanceById = new Map(fixtures.provenance.map((item) => [item.id, item]));

  assert(fixtures.organizations.length === 24, "Expected exactly 24 synthetic organizations.");
  assert(fixtures.fixtureVersion === "1.0.0", "Expected fixture version 1.0.0.");

  for (const org of fixtures.organizations) {
    assert(org.synthetic === true, `Organization ${org.id} must be synthetic.`);
    assert(org.dataClassification === "synthetic", `Organization ${org.id} must be synthetic.`);
    assertOrganizationFitUnassessed(org.fit.status);
    FinancialInstitutionPayloadSchema.parse(org.verticalPayload);
  }

  for (const evidence of fixtures.evidence) {
    const provenance = evidence.provenanceId
      ? (provenanceById.get(evidence.provenanceId) ?? null)
      : null;
    assertEvidenceInvariants(evidence, provenance);
  }

  console.log("Synthetic dataset validation passed.");
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Synthetic dataset validation failed: ${message}`);
  process.exitCode = 1;
}
