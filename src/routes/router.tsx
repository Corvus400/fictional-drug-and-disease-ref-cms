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
import { useState } from "react";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorNotice } from "@/components/ErrorNotice";
import { ImageUploader } from "@/components/ImageUploader";
import { ResourceForm } from "@/components/ResourceForm";
import { useDeleteResource, useResourceDetail, useResourceList } from "@/lib/api/resources";
import type { ResourceKind } from "@/lib/api/schema";
import { t } from "@/lib/i18n/messages";

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
      <aside className="sidebar">
        <p className="eyebrow">{t("localAdmin")}</p>
        <Link className="brand" to="/drugs" search={defaultSearch}>
          {t("appTitle")}
        </Link>
        <nav aria-label={t("resourceNavigation")}>
          <Link
            activeProps={{ className: "nav-link active" }}
            className="nav-link"
            to="/drugs"
            search={defaultSearch}
          >
            {t("drugs")}
          </Link>
          <Link
            activeProps={{ className: "nav-link active" }}
            className="nav-link"
            to="/diseases"
            search={defaultSearch}
          >
            {t("diseases")}
          </Link>
        </nav>
      </aside>
      <main className="main-pane">
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
      <header className="page-header">
        <div>
          <p className="breadcrumb">
            {t("dashboard")} / {title}
          </p>
          <h1 id="list-title">
            {title}
            {t("list")}
          </h1>
        </div>
        <a className="button button-primary" href={`/${kind}/new`}>
          {t("create")}
        </a>
      </header>
      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          navigate({
            search: (previous) => ({
              ...previous,
              q: String(formData.get("q") ?? ""),
              page: 1,
            }),
          });
        }}
      >
        <label className="field compact">
          <span>{t("search")}</span>
          <input className="input" defaultValue={search.q ?? ""} name="q" />
        </label>
        <button className="button button-secondary" type="submit">
          {t("search")}
        </button>
      </form>
      {list.isLoading ? <p>{t("loading")}</p> : null}
      {list.error ? <ErrorNotice error={list.error} /> : null}
      {list.data ? (
        <>
          <p className="muted">
            {t("totalCount")}: {list.data.totalCount}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t("name")}</th>
                  <th>{t("category")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{resourceDisplayName(item)}</td>
                    <td>{resourceCategory(item)}</td>
                    <td>
                      <a className="text-link" href={`/${kind}/${item.id}`}>
                        {t("detail")}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.data.items.length === 0 ? <p>{t("noItems")}</p> : null}
        </>
      ) : null}
    </section>
  );
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
            <a href={`/${kind}`}>{title}</a> / {data.id}
          </p>
          <h1 id="detail-title">{resourceDisplayName(data)}</h1>
        </div>
        <div className="button-row">
          <a className="button button-secondary" href={`/${kind}/${data.id}/edit`}>
            {t("edit")}
          </a>
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
        <h2>{t("detail")}</h2>
        <pre className="json-view">{JSON.stringify(data, null, 2)}</pre>
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
            <a href={`/${kind}`}>{title}</a> / {isNew ? t("create") : params.id}
          </p>
          <h1 id="editor-title">
            {title}
            {isNew ? t("create") : t("edit")}
          </h1>
        </div>
      </header>
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
