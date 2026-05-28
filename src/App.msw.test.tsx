import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const drugFixture = {
  id: "drug_0001",
  genericName: "テスト一般名",
  brandName: "テスト販売名",
  brandNameKana: "テストハンバイメイ",
  atcCode: "B00AA00",
  yjCode: "",
  therapeuticCategoryName: "試験薬",
  regulatoryClass: ["ordinary"],
  dosageForm: "tablet",
  routeOfAdministration: "oral",
  composition: {
    activeIngredient: "架空成分",
    activeIngredientAmount: { amount: 10, unit: "mg", per: "1錠中" },
    inactiveIngredients: [],
    appearance: "白色錠",
    identificationCode: "",
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
};

const server = setupServer(
  http.post("http://127.0.0.1:19090/v1/admin/token", () => HttpResponse.json({ token: "token" })),
  http.get("http://127.0.0.1:19090/v1/drugs/drug_0001", () =>
    HttpResponse.json(drugFixture, { headers: { ETag: '"v1"' } }),
  ),
  http.get("http://127.0.0.1:19090/v1/diseases", () =>
    HttpResponse.json({ items: [], page: 1, pageSize: 100, totalPages: 1, totalCount: 0 }),
  ),
  http.patch("http://127.0.0.1:19090/v1/admin/drugs/drug_0001", () =>
    HttpResponse.json(
      {
        status: 412,
        title: "Precondition Failed",
        detail: "ETag mismatch",
      },
      { status: 412, headers: { "Content-Type": "application/problem+json" } },
    ),
  ),
);

describe("CMS mutation flows", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllEnvs();
  });
  afterAll(() => server.close());

  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:19090");
    vi.stubEnv("VITE_API_TIMEOUT_MS", "10000");
    vi.stubEnv("VITE_ADMIN_TOKEN_PATH", "/v1/admin/token");
    window.history.pushState(null, "", "/drugs/drug_0001/edit");
    window.scrollTo = vi.fn();
  });

  it("shows a 412 conflict without navigating away from the edit form", async () => {
    const user = userEvent.setup();
    render(<App />);

    const brandName = await screen.findByLabelText(/販売名 必須/);
    await user.clear(brandName);
    await user.type(brandName, "競合した販売名");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "サーバ側で更新されました。最新を取得しました。差分を確認して再編集してください。",
    );
    expect(screen.getByDisplayValue("競合した販売名")).toBeInTheDocument();
  });
});
