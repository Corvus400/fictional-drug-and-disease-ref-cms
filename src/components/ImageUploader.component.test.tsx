import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetPublicConfigForTests, setPublicConfigForTests } from "@/lib/config/config";
import { clearAccessToken, setAccessToken } from "@/lib/security/token-store";
import { ImageUploader } from "./ImageUploader";

describe("ImageUploader", () => {
  afterEach(() => {
    resetPublicConfigForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearAccessToken();
  });

  it("shows the server-returned imageUrl after a successful upload", async () => {
    setPublicConfigForTests({
      apiBaseUrl: "http://127.0.0.1:19090",
      apiTimeoutMs: 5000,
      adminTokenPath: "/v1/admin/token",
    });
    setAccessToken("test-token");
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:local-preview"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          id: "drug_0001",
          generic_name: "一般名",
          brand_name: "販売名",
          brand_name_kana: "ハンバイメイ",
          atc_code: "A00AA00",
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
          image_url: "/v1/images/drugs/drug_0001?size=Original",
        }),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const png = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "image.png",
      { type: "image/png" },
    );

    render(
      <QueryClientProvider client={client}>
        <ImageUploader drugId="drug_0001" />
      </QueryClientProvider>,
    );

    await userEvent.upload(screen.getByLabelText("PNG を選択"), png);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "医薬品画像プレビュー" })).toHaveAttribute(
        "src",
        "http://127.0.0.1:19090/v1/images/drugs/drug_0001?size=Original",
      );
    });
  });
});
