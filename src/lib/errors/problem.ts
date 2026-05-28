import { z } from "zod";
import { t } from "@/lib/i18n/messages";
import type { AppError, FieldError, ProblemDetails } from "./types";

const problemSchema = z
  .object({
    type: z.string().optional(),
    title: z.string().optional(),
    status: z.number().int(),
    detail: z.string().optional(),
    instance: z.string().optional(),
    errors: z
      .array(
        z.object({
          field: z.string(),
          reason: z.string().optional(),
          message: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

export function toFormPath(field: string): string {
  return field
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((segment) => segment.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase()))
    .join(".");
}

export function problemToAppError(problem: ProblemDetails): AppError {
  const message = problem.detail ?? problem.title ?? t("networkError");

  switch (problem.status) {
    case 401:
      return { kind: "unauthorized", message: t("unauthorized") };
    case 403:
      return { kind: "forbidden", message: t("forbidden") };
    case 404:
      return { kind: "notFound", message };
    case 409:
      return { kind: "referenceConflict", message: t("referenceConflict"), references: problem };
    case 412:
      return { kind: "conflict", message: t("conflict"), latest: problem };
    case 422:
      return {
        kind: "validation",
        message: t("validationError"),
        fields: toFieldErrors(problem),
      };
    case 429:
      return { kind: "rateLimited", message: t("rateLimited") };
    default:
      if (problem.status >= 500) {
        return { kind: "network", message: t("networkError") };
      }
      return { kind: "unexpected", message };
  }
}

export function parseProblemDetails(input: unknown): ProblemDetails | undefined {
  const parsed = problemSchema.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}

function toFieldErrors(problem: ProblemDetails): FieldError[] {
  return (
    problem.errors?.map((error) => ({
      field: toFormPath(error.field),
      message: error.message ?? error.reason ?? problem.detail ?? t("validationError"),
    })) ?? []
  );
}
