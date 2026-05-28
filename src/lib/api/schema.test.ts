import { describe, expect, it } from "vitest";
import { diseaseRequestSchema, drugRequestSchema } from "./schema";

describe("CMS request schemas", () => {
  it("strips server-managed drug fields from request payloads", () => {
    const parsed = drugRequestSchema.parse({
      id: "drug_9999",
      imageUrl: "/v1/images/drugs/drug_9999?size=Original",
      revisedAt: "2026-05-28",
      disclaimer: "server text",
      genericName: "テスト一般名",
      brandName: "テスト販売名",
      brandNameKana: "テストハンバイメイ",
      atcCode: "A00AA00",
      therapeuticCategoryName: "試験薬",
      regulatoryClass: ["ordinary"],
      dosageForm: "tablet",
      routeOfAdministration: "oral",
      contraindications: ["禁忌"],
      packages: ["PTP 100錠"],
      manufacturer: "架空製薬",
    });

    expect(parsed).not.toHaveProperty("id");
    expect(parsed).not.toHaveProperty("imageUrl");
    expect(parsed).not.toHaveProperty("revisedAt");
    expect(parsed).not.toHaveProperty("disclaimer");
  });

  it("requires injection-specific drug sections when the route is injection", () => {
    const parsed = drugRequestSchema.safeParse({
      genericName: "テスト一般名",
      brandName: "テスト販売名",
      brandNameKana: "テストハンバイメイ",
      atcCode: "A00AA00",
      therapeuticCategoryName: "試験薬",
      regulatoryClass: ["ordinary"],
      dosageForm: "injection_form",
      routeOfAdministration: "injection",
      contraindications: ["禁忌"],
      packages: ["バイアル"],
      manufacturer: "架空製薬",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path.join("."))).toContain(
      "administrationPrecautions",
    );
  });

  it("requires infectious disease fields for ICD-10 chapter I", () => {
    const parsed = diseaseRequestSchema.safeParse({
      name: "架空感染症",
      nameKana: "カクウカンセンショウ",
      icd10Chapter: "chapter_i",
      medicalDepartment: ["internal_medicine"],
      chronicity: "acute",
      infectious: false,
      summary: "概要",
      etiology: "原因",
      symptoms: { mainSymptoms: ["発熱"] },
      diagnosticCriteria: { required: ["検査"] },
      requiredExams: ["血液検査"],
      treatments: {},
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path.join("."))).toContain("infectious");
  });
});
