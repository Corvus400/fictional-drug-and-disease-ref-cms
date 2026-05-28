import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, setAccessToken } from "@/lib/security/token-store";
import { patchResource } from "./resources";

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
});
