import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
  redirect,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { Database, Plus, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorNotice } from "@/components/ErrorNotice";
import { ImageUploader } from "@/components/ImageUploader";
import { ResourceForm } from "@/components/ResourceForm";
import { resolveApiUrl } from "@/lib/api/client";
import { useDeleteResource, useResourceDetail, useResourceList } from "@/lib/api/resources";
import {
  type Disease,
  type Drug,
  dosageForms,
  icd10Chapters,
  type ResourceKind,
} from "@/lib/api/schema";
import { formatOption, t } from "@/lib/i18n/messages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: 1,
    },
  },
});

const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce.number().int().positive().catch(20),
  dosageForm: z.string().optional(),
  atcCode: z.string().optional(),
  icd10Chapter: z.string().optional(),
  sort: z.string().optional(),
});
const defaultSearch = { page: 1, pageSize: 20 };

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/drugs", search: defaultSearch });
  },
});

const drugsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "drugs",
  validateSearch: searchSchema,
  component: () => <ResourceList kind="drugs" />,
});

const diseasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "diseases",
  validateSearch: searchSchema,
  component: () => <ResourceList kind="diseases" />,
});

const drugNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "drugs/new",
  component: () => <ResourceEditor kind="drugs" />,
});

const diseaseNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "diseases/new",
  component: () => <ResourceEditor kind="diseases" />,
});

const drugDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "drugs/$id",
  component: () => <ResourceDetail kind="drugs" />,
});

const diseaseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "diseases/$id",
  component: () => <ResourceDetail kind="diseases" />,
});

const drugEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "drugs/$id/edit",
  component: () => <ResourceEditor kind="drugs" />,
});

const diseaseEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "diseases/$id/edit",
  component: () => <ResourceEditor kind="diseases" />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  drugsRoute,
  diseasesRoute,
  drugNewRoute,
  diseaseNewRoute,
  drugDetailRoute,
  diseaseDetailRoute,
  drugEditRoute,
  diseaseEditRoute,
]);

const router = createRouter({
  routeTree,
  context: { queryClient },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

function RootLayout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("skipToMain")}
      </a>
      <aside className="sidebar">
        <p className="eyebrow">{t("localAdmin")}</p>
        <Link className="brand" to="/drugs" search={defaultSearch}>
          <Database aria-hidden="true" size={20} />
          <span className="brand-copy">
            <span>{t("appTitleLine1")}</span>
            <span>{t("appTitleLine2")}</span>
          </span>
        </Link>
      </aside>
      <main className="main-pane" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function ResourceList({ kind }: { kind: ResourceKind }) {
  const search = useSearch({ from: kind === "drugs" ? "/drugs" : "/diseases" });
  const navigate = useNavigate({ from: kind === "drugs" ? "/drugs" : "/diseases" });
  const list = useResourceList(kind, search);
  const title = kind === "drugs" ? t("drugs") : t("diseases");

  return (
    <section className="page-stack" aria-labelledby="list-title">
      <header className="console-header">
        <div>
          <p className="breadcrumb">
            {t("dashboard")} / {title}
          </p>
          <h1 id="list-title">
            {title}
            {t("list")}
          </h1>
          <p className="page-lede">
            {kind === "drugs" ? t("drugListDescription") : t("diseaseListDescription")}
          </p>
        </div>
        <Link className="button button-primary" to={`/${kind}/new`}>
          <Plus aria-hidden="true" size={16} />
          {t("create")}
        </Link>
      </header>
      <div className="status-strip">
        <span className="status-pill">
          <ShieldCheck aria-hidden="true" size={14} />
          {t("localOnly")}
        </span>
        <span className="status-pill">{t("localApi")}</span>
        <span className="status-pill">{t("fictionalData")}</span>
      </div>
      <form
        className="filter-panel"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          navigate({
            search: (previous) => ({
              ...previous,
              q: String(formData.get("q") ?? ""),
              dosageForm:
                kind === "drugs" ? emptyToUndefined(formData.get("dosageForm")) : undefined,
              atcCode: kind === "drugs" ? emptyToUndefined(formData.get("atcCode")) : undefined,
              icd10Chapter:
                kind === "diseases" ? emptyToUndefined(formData.get("icd10Chapter")) : undefined,
              sort: emptyToUndefined(formData.get("sort")),
              page: 1,
            }),
          });
        }}
      >
        <div className="filter-panel-title">
          <Search aria-hidden="true" size={17} />
          {t("search")}
        </div>
        <label className="field compact">
          <span>{t("search")}</span>
          <input className="input" autoComplete="off" defaultValue={search.q ?? ""} name="q" />
        </label>
        {kind === "drugs" ? (
          <>
            <label className="field compact">
              <span>{t("dosageForm")}</span>
              <select className="input" name="dosageForm" defaultValue={search.dosageForm ?? ""}>
                <option value="">{t("all")}</option>
                {dosageForms.map((option) => (
                  <option key={option} value={option}>
                    {formatOption(option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact">
              <span>{t("atcCode")}</span>
              <input
                className="input"
                autoComplete="off"
                defaultValue={search.atcCode ?? ""}
                name="atcCode"
                spellCheck={false}
              />
            </label>
          </>
        ) : (
          <label className="field compact">
            <span>{t("icd10Chapter")}</span>
            <select className="input" name="icd10Chapter" defaultValue={search.icd10Chapter ?? ""}>
              <option value="">{t("all")}</option>
              {icd10Chapters.map((option) => (
                <option key={option} value={option}>
                  {formatOption(option)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field compact">
          <span>{t("sort")}</span>
          <select className="input" name="sort" defaultValue={search.sort ?? ""}>
            <option value="">{t("sortDefault")}</option>
            <option value={kind === "drugs" ? "brandName" : "name"}>
              {kind === "drugs" ? t("sortBrandName") : t("sortName")}
            </option>
            <option value="updatedAt">{t("sortUpdatedAt")}</option>
          </select>
        </label>
        <button className="button button-secondary" type="submit">
          {t("search")}
        </button>
      </form>
      {list.isLoading ? <p>{t("loading")}</p> : null}
      {list.error ? <ErrorNotice error={list.error} /> : null}
      {list.data ? (
        <>
          <div className="summary-row">
            <span className="metric-card">
              <strong className="tabular">{list.data.totalCount}</strong>
              {t("totalCount")}
            </span>
            <span className="metric-card">
              <strong className="tabular">
                {search.page} / {list.data.totalPages}
              </strong>
              {t("page")}
            </span>
            <PaginationControls
              currentPage={search.page}
              totalPages={list.data.totalPages}
              onPrevious={() =>
                navigate({
                  search: (previous) => ({ ...previous, page: Math.max(1, search.page - 1) }),
                })
              }
              onNext={() =>
                navigate({
                  search: (previous) => ({ ...previous, page: search.page + 1 }),
                })
              }
            />
            <ResourceSwitcher />
          </div>
          <div className="table-wrap data-panel">
            <table>
              <thead>
                <tr>
                  {kind === "drugs" ? <th>{t("image")}</th> : null}
                  <th>ID</th>
                  <th>{t("name")}</th>
                  <th>{t("category")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((item) => (
                  <tr key={item.id}>
                    {kind === "drugs" ? (
                      <td>
                        <ResourceThumbnail item={item} />
                      </td>
                    ) : null}
                    <td>{item.id}</td>
                    <td>{resourceDisplayName(item)}</td>
                    <td>
                      <span className="chip">{resourceCategory(item)}</span>
                    </td>
                    <td>
                      <Link className="text-link" to={`/${kind}/$id`} params={{ id: item.id }}>
                        {t("detail")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.data.items.length === 0 ? <p>{t("noItems")}</p> : null}
          <PaginationControls
            currentPage={search.page}
            totalPages={list.data.totalPages}
            onPrevious={() =>
              navigate({
                search: (previous) => ({ ...previous, page: Math.max(1, search.page - 1) }),
              })
            }
            onNext={() =>
              navigate({
                search: (previous) => ({ ...previous, page: search.page + 1 }),
              })
            }
          />
        </>
      ) : null}
    </section>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <nav className="pagination pagination-top" aria-label={t("page")}>
      <button
        className="button button-secondary"
        type="button"
        disabled={currentPage <= 1}
        onClick={onPrevious}
      >
        {t("previousPage")}
      </button>
      <span className="tabular">
        {t("page")}: {currentPage} / {totalPages}
      </span>
      <button
        className="button button-secondary"
        type="button"
        disabled={currentPage >= totalPages}
        onClick={onNext}
      >
        {t("nextPage")}
      </button>
    </nav>
  );
}

function ResourceSwitcher() {
  return (
    <nav className="resource-switcher" aria-label={t("resourceNavigation")}>
      <Link
        activeProps={{ className: "switch-link active" }}
        className="switch-link"
        to="/drugs"
        search={defaultSearch}
      >
        {t("drugs")}
      </Link>
      <Link
        activeProps={{ className: "switch-link active" }}
        className="switch-link"
        to="/diseases"
        search={defaultSearch}
      >
        {t("diseases")}
      </Link>
    </nav>
  );
}

function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? "");
  return text === "" ? undefined : text;
}

function ResourceThumbnail({ item }: { item: unknown }) {
  if (typeof item !== "object" || item === null || !("imageUrl" in item)) {
    return null;
  }
  const url = resolveApiUrl(typeof item.imageUrl === "string" ? item.imageUrl : undefined);
  return url ? (
    <img className="thumb" src={url} alt="" width="42" height="42" loading="lazy" />
  ) : null;
}

function ResourceDetail({ kind }: { kind: ResourceKind }) {
  const { id: rawId } = useParams({ strict: false });
  const id = String(rawId ?? "");
  const detail = useResourceDetail(kind, id);
  const remove = useDeleteResource(kind, id, detail.data?.etag);
  const navigate = useNavigate();
  const title = kind === "drugs" ? t("drugs") : t("diseases");
  const [confirming, setConfirming] = useState(false);

  if (detail.isLoading) {
    return <p>{t("loading")}</p>;
  }
  if (detail.error) {
    return <ErrorNotice error={detail.error} />;
  }
  if (!detail.data) {
    return null;
  }

  const data = detail.data.data;
  return (
    <section className="page-stack" aria-labelledby="detail-title">
      <header className="page-header">
        <div>
          <p className="breadcrumb">
            <Link to={`/${kind}`} search={defaultSearch}>
              {title}
            </Link>{" "}
            / {data.id}
          </p>
          <h1 id="detail-title">{resourceDisplayName(data)}</h1>
        </div>
        <div className="button-row">
          <Link
            className="button button-secondary"
            to={`/${kind}/$id/edit`}
            params={{ id: data.id }}
          >
            {t("edit")}
          </Link>
          <button
            className="button button-danger"
            type="button"
            onClick={() => setConfirming(true)}
          >
            {t("delete")}
          </button>
        </div>
      </header>
      {"imageUrl" in data && kind === "drugs" ? (
        <ImageUploader
          drugId={String(data.id)}
          imageUrl={typeof data.imageUrl === "string" ? data.imageUrl : undefined}
        />
      ) : null}
      <section className="section-panel">
        {kind === "drugs" ? (
          <DrugDetailSections data={data as Drug} />
        ) : (
          <DiseaseDetailSections data={data as Disease} />
        )}
      </section>
      <ConfirmDialog
        open={confirming}
        pending={remove.isPending}
        title={`${data.id} ${t("deleteTitle")}`}
        description={t("deleteDescription")}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => navigate({ to: `/${kind}` }),
          })
        }
      />
      {remove.error ? <ErrorNotice error={remove.error} /> : null}
    </section>
  );
}

function DrugDetailSections({ data }: { data: Drug }) {
  return (
    <div className="detail-sections">
      <DetailSection title={t("basicInfo")}>
        <DetailItem label={t("brandName")} value={data.brandName} />
        <DetailItem label={t("genericName")} value={data.genericName} />
        <DetailItem label={t("brandNameKana")} value={data.brandNameKana} />
        <DetailItem label={t("yjCode")} value={data.yjCode} />
        <DetailItem label={t("atcCode")} value={data.atcCode} />
        <DetailItem label={t("therapeuticCategoryName")} value={data.therapeuticCategoryName} />
        <DetailItem label={t("dosageForm")} value={formatOption(data.dosageForm)} />
        <DetailItem
          label={t("routeOfAdministration")}
          value={formatOption(data.routeOfAdministration)}
        />
        <DetailItem
          label={t("regulatoryClass")}
          value={data.regulatoryClass.map(formatOption).join(", ")}
        />
        <DetailItem label={t("manufacturer")} value={data.manufacturer} />
        <DetailItem label={t("id")} value={data.id} />
        <DetailItem label={t("revisedAt")} value={data.revisedAt} />
      </DetailSection>
      <DetailSection title={t("drugCompositionDosage")}>
        <DetailItem label={t("activeIngredient")} value={data.composition.activeIngredient} />
        <DetailItem
          label={t("activeIngredientAmount")}
          value={`${data.composition.activeIngredientAmount.amount} ${formatOption(data.composition.activeIngredientAmount.unit)}`}
        />
        <DetailItem
          label={t("inactiveIngredients")}
          value={data.composition.inactiveIngredients.join(", ")}
        />
        <DetailItem label={t("appearance")} value={data.composition.appearance} />
        <DetailItem label={t("identificationCode")} value={data.composition.identificationCode} />
        <DetailItem label={t("standardDosage")} value={data.dosage.standardDosage} wide />
        <DetailItem
          label={t("ageSpecificDosage")}
          value={structuredText(data.dosage.ageSpecificDosage)}
          wide
        />
        <DetailItem
          label={t("renalAdjustment")}
          value={structuredText(data.dosage.renalAdjustment)}
          wide
        />
        <DetailItem
          label={t("hepaticAdjustment")}
          value={structuredText(data.dosage.hepaticAdjustment)}
          wide
        />
        <DetailItem label={t("indications")} value={orderedText(data.indications)} wide />
        <DetailItem
          label={t("indicationsRelatedPrecautions")}
          value={orderedText(data.indicationsRelatedPrecautions)}
          wide
        />
        <DetailItem
          label={t("dosageRelatedPrecautions")}
          value={orderedText(data.dosageRelatedPrecautions)}
          wide
        />
      </DetailSection>
      <DetailSection title={t("drugSafety")}>
        <DetailItem label={t("warning")} value={orderedText(data.warning)} wide />
        <DetailItem
          label={t("contraindications")}
          value={orderedText(data.contraindications)}
          wide
        />
        <DetailItem
          label={t("importantPrecautions")}
          value={orderedText(data.importantPrecautions)}
          wide
        />
        <DetailItem
          label={t("precautionsForSpecificPopulations")}
          value={structuredText(data.precautionsForSpecificPopulations)}
          wide
        />
        <DetailItem
          label={t("interactionsProhibited")}
          value={structuredText(data.interactions?.combinationProhibited)}
          wide
        />
        <DetailItem
          label={t("interactionsCaution")}
          value={structuredText(data.interactions?.combinationCaution)}
          wide
        />
        <DetailItem
          label={t("seriousAdverseReactions")}
          value={structuredText(data.adverseReactions.serious)}
          wide
        />
        <DetailItem
          label={t("adverseOver5")}
          value={data.adverseReactions.other.over5Percent.join(", ")}
          wide
        />
        <DetailItem
          label={t("adverseBetween1And5")}
          value={data.adverseReactions.other.between1And5Percent.join(", ")}
          wide
        />
        <DetailItem
          label={t("adverseUnder1")}
          value={data.adverseReactions.other.under1Percent.join(", ")}
          wide
        />
        <DetailItem
          label={t("adverseUnknown")}
          value={data.adverseReactions.other.frequencyUnknown.join(", ")}
          wide
        />
        <DetailItem
          label={t("effectsOnLabTests")}
          value={orderedText(data.effectsOnLabTests)}
          wide
        />
        <DetailItem label={t("overdoseSymptoms")} value={data.overdose?.symptoms} wide />
        <DetailItem label={t("overdoseManagement")} value={data.overdose?.management} wide />
        <DetailItem
          label={t("administrationPrecautions")}
          value={orderedText(data.administrationPrecautions)}
          wide
        />
        <DetailItem label={t("otherPrecautions")} value={orderedText(data.otherPrecautions)} wide />
      </DetailSection>
      <DetailSection title={t("drugSupplement")}>
        <DetailItem
          label={t("bloodConcentration")}
          value={data.pharmacokinetics?.bloodConcentration}
          wide
        />
        <DetailItem label={t("absorption")} value={data.pharmacokinetics?.absorption} wide />
        <DetailItem label={t("distribution")} value={data.pharmacokinetics?.distribution} wide />
        <DetailItem label={t("metabolism")} value={data.pharmacokinetics?.metabolism} wide />
        <DetailItem label={t("excretion")} value={data.pharmacokinetics?.excretion} wide />
        <DetailItem
          label={t("pkParameters")}
          value={structuredText(data.pharmacokinetics?.parameters)}
          wide
        />
        <DetailItem
          label={t("clinicalResults")}
          value={structuredText(data.clinicalResults)}
          wide
        />
        <DetailItem label={t("pharmacologyMechanism")} value={data.pharmacology?.mechanism} wide />
        <DetailItem label={t("pharmacologyEffect")} value={data.pharmacology?.effect} wide />
        <DetailItem
          label={t("physicochemicalProperties")}
          value={structuredText(data.physicochemicalProperties)}
          wide
        />
        <DetailItem
          label={t("handlingPrecautions")}
          value={orderedText(data.handlingPrecautions)}
          wide
        />
        <DetailItem
          label={t("approvalConditions")}
          value={orderedText(data.approvalConditions)}
          wide
        />
        <DetailItem label={t("packages")} value={structuredText(data.packages)} wide />
        <DetailItem label={t("references")} value={structuredText(data.references)} wide />
        <DetailItem label={t("insuranceNotes")} value={orderedText(data.insuranceNotes)} wide />
      </DetailSection>
      <DetailSection title={t("relatedResources")}>
        <DetailItem label={t("relatedDiseases")} value={data.relatedDiseaseIds.join(", ")} wide />
      </DetailSection>
    </div>
  );
}

function DiseaseDetailSections({ data }: { data: Disease }) {
  return (
    <div className="detail-sections">
      <DetailSection title={t("basicInfo")}>
        <DetailItem label={t("diseaseName")} value={data.name} />
        <DetailItem label={t("diseaseNameKana")} value={data.nameKana} />
        <DetailItem label={t("diseaseNameEnglish")} value={data.nameEnglish} />
        <DetailItem label={t("icd10Chapter")} value={formatOption(data.icd10Chapter)} />
        <DetailItem label={t("chronicity")} value={formatOption(data.chronicity)} />
        <DetailItem label={t("infectious")} value={data.infectious} />
        <DetailItem
          label={t("medicalDepartment")}
          value={data.medicalDepartment.map(formatOption).join(", ")}
        />
        <DetailItem label={t("synonyms")} value={data.synonyms.join(", ")} />
        <DetailItem label={t("id")} value={data.id} />
        <DetailItem label={t("revisedAt")} value={data.revisedAt} />
      </DetailSection>
      <DetailSection title={t("diseaseInfo")}>
        <DetailItem label={t("summary")} value={data.summary} wide />
        <DetailItem label={t("epidemiology")} value={structuredText(data.epidemiology)} wide />
        <DetailItem label={t("etiology")} value={data.etiology} wide />
        <DetailItem label={t("mainSymptoms")} value={data.symptoms.mainSymptoms.join(", ")} wide />
        <DetailItem
          label={t("associatedSymptoms")}
          value={data.symptoms.associatedSymptoms.join(", ")}
          wide
        />
        <DetailItem
          label={t("onsetPattern")}
          value={formatOption(data.symptoms.onsetPattern ?? "")}
          wide
        />
        <DetailItem
          label={t("diagnosticCriteria")}
          value={data.diagnosticCriteria.required.join(", ")}
          wide
        />
        <DetailItem
          label={t("supportingCriteria")}
          value={data.diagnosticCriteria.supporting.join(", ")}
          wide
        />
        <DetailItem label={t("criteriaNotes")} value={data.diagnosticCriteria.notes} wide />
        <DetailItem label={t("requiredExams")} value={structuredText(data.requiredExams)} wide />
        <DetailItem
          label={t("severityGrading")}
          value={structuredText(data.severityGrading)}
          wide
        />
        <DetailItem
          label={t("differentialDiagnoses")}
          value={data.differentialDiagnoses.join(", ")}
          wide
        />
        <DetailItem label={t("complications")} value={data.complications.join(", ")} wide />
        <DetailItem label={t("treatments")} value={structuredText(data.treatments)} wide />
        <DetailItem label={t("prognosis")} value={data.prognosis} wide />
        <DetailItem label={t("prevention")} value={data.prevention.join(", ")} wide />
      </DetailSection>
      <DetailSection title={t("relatedResources")}>
        <DetailItem label={t("relatedDrugs")} value={data.relatedDrugIds.join(", ")} wide />
        <DetailItem label={t("relatedDiseases")} value={data.relatedDiseaseIds.join(", ")} wide />
      </DetailSection>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section" aria-labelledby={`detail-${title}`}>
      <h2 id={`detail-${title}`}>{title}</h2>
      <dl className="detail-grid">{children}</dl>
    </section>
  );
}

function DetailItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: unknown;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "detail-item detail-item-wide" : "detail-item"}>
      <dt>{label}</dt>
      <dd>{displayValue(value)}</dd>
    </div>
  );
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return t("unset");
  }
  if (typeof value === "boolean") {
    return value ? t("yes") : t("no");
  }
  return String(value);
}

function orderedText(items: Array<{ order: number; content: string }>): string {
  return items.map((item) => `${item.order}. ${item.content}`).join("\n");
}

function structuredText(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => `${index + 1}. ${structuredText(item)}`).join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined && child !== null && child !== "")
      .map(([key, child]) => `${key}: ${structuredText(child)}`)
      .join("\n");
  }
  if (typeof value === "boolean") {
    return value ? t("yes") : t("no");
  }
  return String(value);
}

function ResourceEditor({ kind }: { kind: ResourceKind }) {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const isNew = params.id === undefined;
  const detail = useResourceDetail(kind, String(params.id ?? ""), !isNew);
  const title = kind === "drugs" ? t("drugs") : t("diseases");

  if (!isNew && detail.isLoading) {
    return <p>{t("loading")}</p>;
  }
  if (!isNew && detail.error) {
    return <ErrorNotice error={detail.error} />;
  }

  return (
    <section className="page-stack" aria-labelledby="editor-title">
      <header className="page-header">
        <div>
          <p className="breadcrumb">
            <Link to={`/${kind}`} search={defaultSearch}>
              {title}
            </Link>{" "}
            / {isNew ? t("create") : params.id}
          </p>
          <h1 id="editor-title">
            {title}
            {isNew ? t("create") : t("edit")}
          </h1>
        </div>
      </header>
      {!isNew && kind === "drugs" && detail.data ? (
        <ImageUploader
          drugId={String(detail.data.data.id)}
          imageUrl={
            "imageUrl" in detail.data.data && typeof detail.data.data.imageUrl === "string"
              ? detail.data.data.imageUrl
              : undefined
          }
        />
      ) : null}
      <ResourceForm
        kind={kind}
        initialValue={detail.data?.data}
        etag={detail.data?.etag}
        onSaved={(id) => navigate({ to: `/${kind}/$id`, params: { id } })}
      />
    </section>
  );
}

function resourceDisplayName(data: unknown): string {
  if (typeof data !== "object" || data === null) {
    return "";
  }
  if ("brandName" in data && typeof data.brandName === "string") {
    return data.brandName;
  }
  if ("genericName" in data && typeof data.genericName === "string") {
    return data.genericName;
  }
  if ("name" in data && typeof data.name === "string") {
    return data.name;
  }
  if ("id" in data && typeof data.id === "string") {
    return data.id;
  }
  return "";
}

function resourceCategory(data: unknown): string {
  if (typeof data !== "object" || data === null) {
    return "";
  }
  if ("dosageForm" in data && typeof data.dosageForm === "string") {
    return data.dosageForm;
  }
  if ("icd10Chapter" in data && typeof data.icd10Chapter === "string") {
    return data.icd10Chapter;
  }
  return "";
}
