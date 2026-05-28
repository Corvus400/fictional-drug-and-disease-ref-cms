import { t } from "@/lib/i18n/messages";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = t("confirmDelete"),
  pending = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section aria-modal="true" className="dialog" role="dialog" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        <div className="button-row">
          <button className="button button-secondary" type="button" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button
            className="button button-danger"
            type="button"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? t("loading") : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
