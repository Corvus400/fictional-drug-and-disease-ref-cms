import { t } from "@/lib/i18n/messages";

type ErrorNoticeProps = {
  error: unknown;
};

export function ErrorNotice({ error }: ErrorNoticeProps) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : t("networkError");

  return (
    <div className="notice notice-error" role="alert" aria-live="polite">
      {message}
    </div>
  );
}
