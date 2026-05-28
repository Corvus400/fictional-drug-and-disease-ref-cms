import { render, screen, waitFor, within } from "@testing-library/react";
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
  http.get("http://127.0.0.1:19090/v1/drugs", () =>
    HttpResponse.json({ items: [], page: 1, pageSize: 20, totalPages: 1, totalCount: 0 }),
  ),
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
  let drugDetailRequests = 0;
  let lastDrugListUrl = "";
  let lastDiseaseListUrl = "";

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => {
    drugDetailRequests = 0;
    lastDrugListUrl = "";
    lastDiseaseListUrl = "";
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
    server.use(
      http.get("http://127.0.0.1:19090/v1/drugs/drug_0001", () => {
        drugDetailRequests += 1;
        return HttpResponse.json(drugFixture, { headers: { ETag: '"v1"' } });
      }),
    );
    const user = userEvent.setup();
    render(<App />);

    const brandName = await screen.findByLabelText(/販売名 必須/);
    await user.clear(brandName);
    await user.type(brandName, "競合した販売名");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "サーバ側で更新されました。最新を取得しました。差分を確認して再編集してください。",
    );
    await waitFor(() => expect(drugDetailRequests).toBeGreaterThanOrEqual(2));
    expect(screen.getByDisplayValue("競合した販売名")).toBeInTheDocument();
  });

  it("renders drug detail as structured sections instead of raw JSON", async () => {
    window.history.pushState(null, "", "/drugs/drug_0001");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "テスト販売名" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "基本情報" })).toBeInTheDocument();
    expect(screen.getByText("販売名")).toBeInTheDocument();
    expect(screen.getAllByText("テスト販売名").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/"brandName"/)).not.toBeInTheDocument();
  });

  it("keeps drug list filters in the route search state", async () => {
    const user = userEvent.setup();
    window.history.pushState(null, "", "/drugs");

    render(<App />);

    await user.selectOptions(await screen.findByLabelText("剤形"), "injection_form");
    await user.type(screen.getByLabelText("ATC コード"), "B00");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(window.location.search).toContain("dosageForm=injection_form");
    expect(window.location.search).toContain("atcCode=B00");
  });

  it("keeps sort in the route search state and forwards it to the API query", async () => {
    server.use(
      http.get("http://127.0.0.1:19090/v1/drugs", ({ request }) => {
        lastDrugListUrl = request.url;
        return HttpResponse.json({
          items: [],
          page: 1,
          pageSize: 20,
          totalPages: 1,
          totalCount: 0,
        });
      }),
    );
    const user = userEvent.setup();
    window.history.pushState(null, "", "/drugs");

    render(<App />);

    await user.selectOptions(await screen.findByLabelText("並び順"), "brandName");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(window.location.search).toContain("sort=brandName");
    await waitFor(() => expect(lastDrugListUrl).toContain("sort=brand_name"));
  });

  it("searches reference candidates through the API and resolves selected labels by id", async () => {
    server.use(
      http.get("http://127.0.0.1:19090/v1/diseases", ({ request }) => {
        lastDiseaseListUrl = request.url;
        return HttpResponse.json({
          items: [{ id: "disease_0999", name: "遠隔候補疾患", icd10Chapter: "chapter_i" }],
          page: 1,
          pageSize: 100,
          totalPages: 1,
          totalCount: 1,
        });
      }),
      http.get("http://127.0.0.1:19090/v1/diseases/disease_0001", () =>
        HttpResponse.json({
          id: "disease_0001",
          name: "既存関連疾患",
          nameKana: "キソンカンレンシッカン",
          icd10Chapter: "chapter_i",
          medicalDepartment: ["internal_medicine"],
          chronicity: "acute",
          infectious: true,
          summary: "概要",
          epidemiology: { riskFactors: ["接触"] },
          etiology: "原因",
          symptoms: { mainSymptoms: ["発熱"], onsetPattern: "acute" },
          diagnosticCriteria: { required: ["検査"] },
          requiredExams: [{ name: "血液検査", category: "blood_test", typicalFinding: "炎症" }],
          treatments: { pharmacological: [], nonPharmacological: [], acutePhaseProtocol: [] },
          prevention: ["予防"],
          relatedDrugIds: [],
          relatedDiseaseIds: [],
        }),
      ),
      http.get("http://127.0.0.1:19090/v1/drugs/drug_0001", () =>
        HttpResponse.json(
          { ...drugFixture, relatedDiseaseIds: ["disease_0001"] },
          { headers: { ETag: '"v1"' } },
        ),
      ),
    );
    const user = userEvent.setup();
    window.history.pushState(null, "", "/drugs/drug_0001/edit");

    render(<App />);

    const relatedDiseases = await screen.findByRole("group", { name: "関連疾患" });
    expect(await within(relatedDiseases).findByText(/既存関連疾患/)).toBeInTheDocument();
    await user.type(within(relatedDiseases).getByLabelText("検索"), "遠隔");

    await waitFor(() => expect(lastDiseaseListUrl).toContain("keyword=%E9%81%A0%E9%9A%94"));
    expect(
      await within(relatedDiseases).findByRole("option", { name: /遠隔候補疾患/ }),
    ).toBeVisible();
  });

  it("shows the drug image uploader on the edit screen only for drugs", async () => {
    window.history.pushState(null, "", "/drugs/drug_0001/edit");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "画像" })).toBeInTheDocument();
    expect(screen.getByLabelText("PNG を選択")).toBeInTheDocument();
  });
});
