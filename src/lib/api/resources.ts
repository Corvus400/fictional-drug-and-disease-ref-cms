import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiFetch } from "./client";
import {
  type Disease,
  type DiseaseRequest,
  type Drug,
  type DrugRequest,
  diseaseListSchema,
  diseaseRequestSchema,
  diseaseSchema,
  drugListSchema,
  drugRequestSchema,
  drugSchema,
  type ResourceKind,
  toWireValue,
} from "./schema";

export type ListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  dosageForm?: string;
  atcCode?: string;
  icd10Chapter?: string;
  sort?: string;
};

export function useResourceList(kind: ResourceKind, params: ListParams) {
  return useQuery({
    queryKey: [kind, params],
    queryFn: async () => {
      const result = await listResources(kind, params);
      if (!result.ok) {
        throw result.error;
      }
      return result.value.data;
    },
  });
}

export function useResourceDetail(kind: ResourceKind, id: string, enabled = true) {
  return useQuery({
    enabled,
    queryKey: [singular(kind), id],
    queryFn: async () => {
      const result = await getResource(kind, id);
      if (!result.ok) {
        throw result.error;
      }
      return result.value;
    },
  });
}

export function useSaveResource(kind: ResourceKind, id?: string, etag?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveResourcePayload) => {
      const result =
        id === undefined
          ? await createResource(kind, payload.data)
          : await patchResource(kind, id, payload.patch, etag);
      if (!result.ok) {
        throw result.error;
      }
      return result.value.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [kind] });
      queryClient.invalidateQueries({ queryKey: [singular(kind), data.id] });
    },
  });
}

export type SaveResourcePayload = {
  data: DrugRequest | DiseaseRequest;
  patch: Partial<DrugRequest> | Partial<DiseaseRequest>;
};

export function useDeleteResource(kind: ResourceKind, id: string, etag?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await deleteResource(kind, id, etag);
      if (!result.ok) {
        throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [kind] });
      queryClient.removeQueries({ queryKey: [singular(kind), id] });
    },
  });
}

export function useUploadDrugImage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiFetch<Drug>({
        path: `/v1/admin/drugs/${id}/image`,
        method: "POST",
        body: formData,
        schema: drugSchema,
      });
      if (!result.ok) {
        throw result.error;
      }
      return result.value.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drug", id] });
      queryClient.invalidateQueries({ queryKey: ["drugs"] });
    },
  });
}

export async function listResources(kind: ResourceKind, params: ListParams) {
  return apiFetch({
    path: `/v1/${kind}${toListQuery(kind, params)}`,
    schema: kind === "drugs" ? drugListSchema : diseaseListSchema,
  });
}

export async function getResource(kind: ResourceKind, id: string) {
  return apiFetch({
    path: `/v1/${kind}/${id}`,
    schema: (kind === "drugs" ? drugSchema : diseaseSchema) as z.ZodType<Drug | Disease>,
  });
}

async function createResource(kind: ResourceKind, data: DrugRequest | DiseaseRequest) {
  return apiFetch({
    path: `/v1/admin/${kind}`,
    method: "POST",
    body: toWireValue(requestSchema(kind).parse(data)),
    schema: responseSchema(kind),
  });
}

export async function patchResource(
  kind: ResourceKind,
  id: string,
  patch: Partial<DrugRequest> | Partial<DiseaseRequest>,
  etag?: string,
) {
  return apiFetch({
    path: `/v1/admin/${kind}/${id}`,
    method: "PATCH",
    body: toWireValue(patch),
    headers: {
      ...(etag === undefined ? {} : { "If-Match": etag }),
      "Content-Type": "application/merge-patch+json",
    },
    schema: responseSchema(kind),
  });
}

async function deleteResource(kind: ResourceKind, id: string, etag?: string) {
  return apiFetch({
    path: `/v1/admin/${kind}/${id}`,
    method: "DELETE",
    headers: etag === undefined ? undefined : { "If-Match": etag },
  });
}

function requestSchema(kind: ResourceKind): z.ZodType<DrugRequest | DiseaseRequest> {
  return kind === "drugs" ? drugRequestSchema : diseaseRequestSchema;
}

function responseSchema(kind: ResourceKind): z.ZodType<Drug | Disease> {
  return (kind === "drugs" ? drugSchema : diseaseSchema) as z.ZodType<Drug | Disease>;
}

function singular(kind: ResourceKind): "drug" | "disease" {
  return kind === "drugs" ? "drug" : "disease";
}

function toListQuery(kind: ResourceKind, params: ListParams): string {
  const search = new URLSearchParams();
  setParam(search, "page", params.page);
  setParam(search, "page_size", params.pageSize);
  setParam(search, "keyword", params.q);
  setParam(search, "sort", toWireSort(params.sort));

  if (kind === "drugs") {
    setParam(search, "dosage_form", params.dosageForm);
    setParam(search, "category_atc", params.atcCode);
  } else {
    setParam(search, "icd10_chapter", params.icd10Chapter);
  }
  const query = search.toString();
  return query.length === 0 ? "" : `?${query}`;
}

function setParam(search: URLSearchParams, key: string, value: unknown): void {
  if (value !== undefined && value !== "") {
    search.set(key, String(value));
  }
}

function toWireSort(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return String(toWireValue(value));
}
