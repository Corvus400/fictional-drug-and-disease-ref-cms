import { expect, test } from "@playwright/test";

const drugFixture = {
  id: "drug_0001",
  genericName: "テスト一般名",
  brandName: "テスト販売名",
  brandNameKana: "テストハンバイメイ",
  atcCode: "B00AA00",
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

test("renders the local CMS shell and resource navigation", async ({ page }) => {
  await page.route("http://127.0.0.1:19090/v1/admin/token", async (route) => {
    await route.fulfill({ json: { token: "playwright-token" } });
  });
  await page.route("http://127.0.0.1:19090/v1/drugs**", async (route) => {
    await route.fulfill({
      json: {
        items: [],
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalCount: 0,
      },
    });
  });

  await page.goto("/");

  await expect(page.getByRole("link", { name: "架空医薬品・疾患リファレンス CMS" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "リソース" }).getByRole("link", { name: "医薬品" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "リソース" }).getByRole("link", { name: "疾患" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "医薬品一覧" })).toBeVisible();
});

test("renders structured drug editor controls instead of JSON textareas", async ({ page }) => {
  await page.route("http://127.0.0.1:19090/v1/admin/token", async (route) => {
    await route.fulfill({ json: { token: "playwright-token" } });
  });
  await page.route("http://127.0.0.1:19090/v1/drugs/drug_0001", async (route) => {
    await route.fulfill({ json: drugFixture, headers: { ETag: '"v1"' } });
  });
  await page.route("http://127.0.0.1:19090/v1/diseases**", async (route) => {
    await route.fulfill({
      json: {
        items: [],
        page: 1,
        pageSize: 100,
        totalPages: 1,
        totalCount: 0,
      },
    });
  });

  await page.goto("/drugs/drug_0001/edit");

  await expect(page.getByRole("heading", { name: "医薬品編集" })).toBeVisible();
  await expect(page.getByLabel("剤形 必須")).toHaveValue("tablet");
  await expect(page.getByLabel("剤形 必須").locator("option:checked")).toHaveText("錠剤");
  await expect(page.getByRole("button", { name: "添加物追加" })).toBeVisible();
  await expect(page.getByText("JSON")).toHaveCount(0);
});
