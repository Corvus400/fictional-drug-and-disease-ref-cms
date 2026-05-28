import type { AppError } from "@/lib/errors/types";
import { t } from "@/lib/i18n/messages";

type ErrorNoticeProps = {
  error: unknown;
};

export function ErrorNotice({ error }: ErrorNoticeProps) {
  const message = messageForError(error);

  return (
    <div className="notice notice-error" role="alert" aria-live="polite">
      {message}
    </div>
  );
}

export function messageForError(error: unknown): string {
  if (!isAppError(error)) {
    return t("networkError");
  }

  switch (error.kind) {
    case "notFound":
    case "validation":
    case "conflict":
    case "referenceConflict":
    case "unauthorized":
    case "forbidden":
    case "rateLimited":
    case "network":
    case "unexpected":
      return error.message;
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
}

function isAppError(error: unknown): error is AppError {
  if (typeof error !== "object" || error === null || !("kind" in error) || !("message" in error)) {
    return false;
  }
  const kind = (error as { kind: unknown }).kind;
  return (
    kind === "notFound" ||
    kind === "validation" ||
    kind === "conflict" ||
    kind === "referenceConflict" ||
    kind === "unauthorized" ||
    kind === "forbidden" ||
    kind === "rateLimited" ||
    kind === "network" ||
    kind === "unexpected"
  );
}
