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
            genericName: "一般名",
            brandName: "更新後",
            brandNameKana: "コウシンゴ",
            atcCode: "B00AA00",
            therapeuticCategoryName: "試験薬",
            regulatoryClass: ["ordinary"],
            dosageForm: "tablet",
            routeOfAdministration: "oral",
            composition: {
              activeIngredient: "架空成分",
              activeIngredientAmount: { amount: 10, unit: "mg" },
              inactiveIngredients: [],
              appearance: "白色錠",
            },
            warning: [],
            contraindications: [{ order: 1, content: "禁忌" }],
            indications: [{ order: 1, content: "効能" }],
            indicationsRelatedPrecautions: [],
            dosage: {
              standardDosage: "1日1回",
              ageSpecificDosage: [],
              renalAdjustment: [],
              hepaticAdjustment: [],
            },
            dosageRelatedPrecautions: [],
            importantPrecautions: [],
            precautionsForSpecificPopulations: [],
            interactions: null,
            adverseReactions: {
              serious: [],
              other: {
                over5Percent: [],
                between1And5Percent: [],
                under1Percent: [],
                frequencyUnknown: [],
              },
            },
            effectsOnLabTests: [],
            overdose: null,
            administrationPrecautions: [],
            otherPrecautions: [],
            pharmacokinetics: null,
            clinicalResults: [],
            pharmacology: null,
            physicochemicalProperties: null,
            handlingPrecautions: [],
            approvalConditions: [],
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
            references: [],
            insuranceNotes: [],
            manufacturer: "架空製薬",
            relatedDiseaseIds: [],
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
        body: JSON.stringify({ brandName: "更新後" }),
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
