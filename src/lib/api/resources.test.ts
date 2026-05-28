import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, setAccessToken } from "@/lib/security/token-store";
import { patchResource, putResource, toListQuery } from "./resources";

describe("resource mutations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearAccessToken();
  });

  it("sends dirty fields as JSON Merge Patch with If-Match", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:19090");
    vi.stubEnv("VITE_API_TIMEOUT_MS", "5000");
    vi.stubEnv("VITE_ADMIN_TOKEN_PATH", "/v1/admin/token");
    setAccessToken("test-token");
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "drug_0001",
            generic_name: "一般名",
            brand_name: "更新後",
            brand_name_kana: "コウシンゴ",
            atc_code: "B00AA00",
            therapeutic_category_name: "試験薬",
            regulatory_class: ["ordinary"],
            dosage_form: "tablet",
            route_of_administration: "oral",
            composition: {
              active_ingredient: "架空成分",
              active_ingredient_amount: { amount: 10, unit: "mg" },
              inactive_ingredients: [],
              appearance: "白色錠",
            },
            warning: [],
            contraindications: [{ order: 1, content: "禁忌" }],
            indications: [{ order: 1, content: "効能" }],
            indications_related_precautions: [],
            dosage: {
              standard_dosage: "1日1回",
              age_specific_dosage: [],
              renal_adjustment: [],
              hepatic_adjustment: [],
            },
            dosage_related_precautions: [],
            important_precautions: [],
            precautions_for_specific_populations: [],
            interactions: null,
            adverse_reactions: {
              serious: [],
              other: {
                over5_percent: [],
                between1_and5_percent: [],
                under1_percent: [],
                frequency_unknown: [],
              },
            },
            effects_on_lab_tests: [],
            overdose: null,
            administration_precautions: [],
            other_precautions: [],
            pharmacokinetics: null,
            clinical_results: [],
            pharmacology: null,
            physicochemical_properties: null,
            handling_precautions: [],
            approval_conditions: [],
            packages: [
              {
                size: "PTP 100錠",
                storage_condition: {
                  temperature: "room_temperature",
                  light_protection: false,
                  moisture_protection: false,
                },
                expiration_months: 36,
              },
            ],
            references: [],
            insurance_notes: [],
            manufacturer: "架空製薬",
            related_disease_ids: [],
          }),
          { headers: { "Content-Type": "application/json", ETag: '"v2"' } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await patchResource("drugs", "drug_0001", { brandName: "更新後" }, '"v1"');

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/drugs/drug_0001"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ brand_name: "更新後" }),
        headers: expect.any(Headers),
      }),
    );
    const calls = fetchMock.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>;
    const init = calls.at(0)?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("If-Match")).toBe('"v1"');
    expect(headers.get("Content-Type")).toBe("application/merge-patch+json");
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("sends full replacement payload with PUT and If-Match", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:19090");
    vi.stubEnv("VITE_API_TIMEOUT_MS", "5000");
    vi.stubEnv("VITE_ADMIN_TOKEN_PATH", "/v1/admin/token");
    setAccessToken("test-token");
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "disease_0001",
            name: "疾患名",
            name_kana: "シッカンメイ",
            icd10_chapter: "chapter_i",
            medical_department: ["internal_medicine"],
            chronicity: "acute",
            infectious: true,
            synonyms: [],
            summary: "概要",
            etiology: "原因",
            epidemiology: { risk_factors: ["接触"] },
            symptoms: { main_symptoms: ["発熱"], associated_symptoms: [], onset_pattern: "acute" },
            diagnostic_criteria: { required: ["検査"], supporting: [], notes: "" },
            required_exams: [{ name: "血液検査", category: "blood_test", typical_finding: "炎症" }],
            severity_grading: null,
            differential_diagnoses: [],
            complications: [],
            treatments: {
              pharmacological: [],
              non_pharmacological: [],
              acute_phase_protocol: [],
            },
            prognosis: "",
            prevention: ["手洗い"],
            related_drug_ids: [],
            related_disease_ids: [],
          }),
          { headers: { "Content-Type": "application/json", ETag: '"v2"' } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await putResource(
      "diseases",
      "disease_0001",
      {
        name: "疾患名",
        nameKana: "シッカンメイ",
        nameEnglish: "",
        icd10Chapter: "chapter_i",
        medicalDepartment: ["internal_medicine"],
        chronicity: "acute",
        infectious: true,
        synonyms: [],
        summary: "概要",
        etiology: "原因",
        epidemiology: { riskFactors: ["接触"] },
        symptoms: { mainSymptoms: ["発熱"], associatedSymptoms: [], onsetPattern: "acute" },
        diagnosticCriteria: { required: ["検査"], supporting: [], notes: "" },
        requiredExams: [
          { name: "血液検査", category: "blood_test", typicalFinding: "炎症", referenceRange: "" },
        ],
        severityGrading: null,
        differentialDiagnoses: [],
        complications: [],
        treatments: { pharmacological: [], nonPharmacological: [], acutePhaseProtocol: [] },
        prognosis: "",
        prevention: ["手洗い"],
        relatedDrugIds: [],
        relatedDiseaseIds: [],
      },
      '"v1"',
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/admin/diseases/disease_0001"),
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining('"name":"疾患名"'),
        headers: expect.any(Headers),
      }),
    );
    const calls = fetchMock.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>;
    const headers = calls.at(0)?.[1].headers as Headers;
    expect(headers.get("If-Match")).toBe('"v1"');
    expect(headers.get("Content-Type")).toBe("application/json");
  });
});

describe("resource list query mapping", () => {
  it("maps drug list filters and canonical sort keys to backend query parameters", () => {
    expect(
      toListQuery("drugs", {
        page: 2,
        pageSize: 50,
        q: "頭痛",
        dosageForm: "tablet",
        atcCode: "A",
        regulatoryClass: "prescription_required",
        route: "oral",
        keywordMatch: "prefix",
        keywordTarget: "all",
        adverseReactionKeyword: "疼痛",
        precautionCategory: "pregnant",
        sort: "brand_name_kana",
      }),
    ).toBe(
      "?page=2&page_size=50&keyword=%E9%A0%AD%E7%97%9B&keyword_match=prefix&keyword_target=all&sort=brand_name_kana&dosage_form=tablet&category_atc=A&regulatory_class=prescription_required&route=oral&adverse_reaction_keyword=%E7%96%BC%E7%97%9B&precaution_category=pregnant",
    );
  });

  it("maps disease list filters and canonical sort keys to backend query parameters", () => {
    expect(
      toListQuery("diseases", {
        page: 3,
        pageSize: 25,
        q: "感染",
        icd10Chapter: "chapter_i",
        department: "infectious_disease",
        chronicity: "acute",
        infectious: "true",
        keywordMatch: "partial",
        keywordTarget: "all",
        symptomKeyword: "発熱",
        onsetPattern: "acute",
        examCategory: "blood_test",
        hasPharmacologicalTreatment: "true",
        hasSeverityGrading: "false",
        sort: "name_kana",
      }),
    ).toBe(
      "?page=3&page_size=25&keyword=%E6%84%9F%E6%9F%93&keyword_match=partial&keyword_target=all&sort=name_kana&icd10_chapter=chapter_i&department=infectious_disease&chronicity=acute&infectious=true&symptom_keyword=%E7%99%BA%E7%86%B1&onset_pattern=acute&exam_category=blood_test&has_pharmacological_treatment=true&has_severity_grading=false",
    );
  });
});
