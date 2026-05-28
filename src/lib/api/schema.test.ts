import { describe, expect, it } from "vitest";
import {
  diseaseListSchema,
  diseaseRequestSchema,
  dosageForms,
  drugListSchema,
  drugRequestSchema,
  drugSchema,
  medicalDepartments,
  regulatoryClasses,
  routeOfAdministration,
  toWireValue,
} from "./schema";

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
      composition: {
        activeIngredient: "架空成分",
        activeIngredientAmount: { amount: 10, unit: "mg", per: "1錠中" },
        appearance: "白色の錠剤",
      },
      contraindications: [{ order: 1, content: "禁忌" }],
      indications: [{ order: 1, content: "効能" }],
      dosage: { standardDosage: "1日1回投与する。" },
      dosageRelatedPrecautions: [{ order: 1, content: "長期服用時は経過観察する。" }],
      adverseReactions: {
        serious: [],
        other: {
          over5Percent: [],
          between1And5Percent: [],
          under1Percent: [],
          frequencyUnknown: [],
        },
      },
      packages: [
        {
          size: "PTP 100錠",
          storageCondition: {
            temperature: "room_temperature",
            lightProtection: false,
            moistureProtection: false,
          },
          expirationMonths: 36,
        },
      ],
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
      routeOfAdministration: "injection_route",
      composition: {
        activeIngredient: "架空成分",
        activeIngredientAmount: { amount: 10, unit: "mg" },
        appearance: "注射液",
      },
      contraindications: [{ order: 1, content: "禁忌" }],
      indications: [{ order: 1, content: "効能" }],
      dosage: { standardDosage: "静脈内投与する。" },
      adverseReactions: {
        serious: [],
        other: {
          over5Percent: [],
          between1And5Percent: [],
          under1Percent: [],
          frequencyUnknown: [],
        },
      },
      packages: [
        {
          size: "バイアル",
          storageCondition: {
            temperature: "room_temperature",
            lightProtection: false,
            moistureProtection: false,
          },
          expirationMonths: 24,
        },
      ],
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
      requiredExams: [
        {
          name: "血液検査",
          category: "blood_test",
          typicalFinding: "炎症反応上昇",
        },
      ],
      treatments: {
        pharmacological: [],
        nonPharmacological: [],
        acutePhaseProtocol: [],
      },
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path.join("."))).toContain("infectious");
  });

  it("matches model wire enum values from 03 and 04", () => {
    expect(dosageForms).toContain("liquid");
    expect(dosageForms).toContain("inhaler");
    expect(dosageForms).not.toContain("oral_solution");
    expect(dosageForms).not.toContain("inhalation");

    expect(routeOfAdministration).toContain("injection_route");
    expect(routeOfAdministration).not.toContain("injection");

    expect(regulatoryClasses).toContain("stimulant_precursor");
    expect(regulatoryClasses).toContain("prescription_required");
    expect(regulatoryClasses).not.toContain("prescription_only");

    expect(medicalDepartments).toContain("otolaryngology");
    expect(medicalDepartments).toContain("gynecology");
    expect(medicalDepartments).toContain("emergency");
    expect(medicalDepartments).toContain("infectious_disease");
    expect(medicalDepartments).not.toContain("respiratory_medicine");
  });

  it("parses snake_case live drug list responses into camelCase domain data", () => {
    const parsed = drugListSchema.parse({
      items: [
        {
          id: "drug_0001",
          brand_name: "ライザ",
          generic_name: "シャリブレ",
          therapeutic_category_name: "消化器系および代謝",
          dosage_form: "capsule",
          atc_code: "A99ZZ01",
          image_url: "/v1/images/dosage-forms/capsule?size=Original",
        },
      ],
      page: 1,
      page_size: 20,
      total_pages: 6,
      total_count: 120,
    });

    expect(parsed).toMatchObject({
      pageSize: 20,
      totalPages: 6,
      totalCount: 120,
      items: [{ brandName: "ライザ", dosageForm: "capsule", atcCode: "A99ZZ01" }],
    });
  });

  it("parses live drug detail responses independently from create-form validation", () => {
    const parsed = drugSchema.parse({
      id: "drug_0080",
      generic_name: "トレデキム",
      brand_name: "トレデキム",
      brand_name_kana: "トレデキム",
      atc_code: "L99ZZ80",
      yj_code: "999171158264",
      therapeutic_category_name: "対魔女兵器 (架空分類)",
      regulatory_class: ["poison", "prescription_required"],
      dosage_form: "liquid",
      route_of_administration: "oral",
      composition: {
        active_ingredient: "トレデキム",
        active_ingredient_amount: { amount: 10, unit: "ml", per: null },
        inactive_ingredients: ["ウルクウ"],
        appearance: "無色澄明の液体",
      },
      warning: [{ order: 1, sub_order: null, content: "警告" }],
      contraindications: [{ order: 1, sub_order: null, content: "禁忌" }],
      indications: [],
      dosage: { standard_dosage: "治療用量は設定されていない" },
      adverse_reactions: {
        serious: [],
        other: {
          over5_percent: [],
          between1_and5_percent: [],
          under1_percent: [],
          frequency_unknown: ["急性疼痛"],
        },
      },
      packages: [],
      manufacturer: "魔女因子研究所",
      related_disease_ids: ["disease_0079"],
      image_url: "/v1/images/drugs/drug_0080?size=Original",
    });

    expect(parsed).toMatchObject({
      brandName: "トレデキム",
      indications: [],
      imageUrl: "/v1/images/drugs/drug_0080?size=Original",
      relatedDiseaseIds: ["disease_0079"],
    });
  });

  it("parses snake_case live disease list responses into camelCase domain data", () => {
    const parsed = diseaseListSchema.parse({
      items: [
        {
          id: "disease_0001",
          name: "架空疾患",
          icd10_chapter: "chapter_i",
          chronicity: "acute",
        },
      ],
      page: 1,
      page_size: 20,
      total_pages: 4,
      total_count: 80,
    });

    expect(parsed).toMatchObject({
      pageSize: 20,
      totalPages: 4,
      totalCount: 80,
      items: [{ icd10Chapter: "chapter_i" }],
    });
  });

  it("serializes camelCase request fragments to snake_case wire payloads", () => {
    expect(
      toWireValue({
        brandName: "更新後",
        relatedDiseaseIds: ["disease_0001"],
        composition: { activeIngredientAmount: { amount: 10, unit: "mg" } },
      }),
    ).toEqual({
      brand_name: "更新後",
      related_disease_ids: ["disease_0001"],
      composition: { active_ingredient_amount: { amount: 10, unit: "mg" } },
    });
  });
});
