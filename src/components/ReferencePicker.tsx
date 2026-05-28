import { useId, useMemo, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { useResourceDetail, useResourceList } from "@/lib/api/resources";
import type { ResourceKind } from "@/lib/api/schema";
import { type MessageKey, t } from "@/lib/i18n/messages";

type ReferencePickerProps = {
  name: string;
  labelKey: MessageKey;
  kind: ResourceKind;
  selfId?: string;
};

export function ReferencePicker({ name, labelKey, kind, selfId }: ReferencePickerProps) {
  const { control } = useFormContext();
  const { field } = useController({ control, name, defaultValue: [] });
  const searchId = useId();
  const label = t(labelKey);
  const [query, setQuery] = useState("");
  const selectedIds = useMemo(
    () => (Array.isArray(field.value) ? (field.value as string[]) : []),
    [field.value],
  );
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const list = useResourceList(kind, { page: 1, pageSize: 100, q: query });
  const resources = useMemo(() => list.data?.items ?? [], [list.data?.items]);
  const labels = useMemo(
    () => new Map(resources.map((item) => [item.id, resourceLabel(item)])),
    [resources],
  );
  const options = useMemo(
    () =>
      resources
        .filter((item) => item.id !== selfId)
        .filter((item) => !selected.has(item.id))
        .filter((item) => {
          const haystack = resourceLabel(item).toLowerCase();
          return query === "" || haystack.includes(query.toLowerCase());
        }),
    [query, resources, selected, selfId],
  );

  function updateSelected(next: string[]) {
    field.onChange(next);
    field.onBlur();
  }

  function addReference(id: string) {
    updateSelected([...selectedIds, id]);
  }

  function removeReference(id: string) {
    updateSelected(selectedIds.filter((selectedId) => selectedId !== id));
  }

  return (
    <fieldset className="field-group field-wide reference-picker">
      <legend>{label}</legend>
      <label className="field" htmlFor={searchId}>
        <span>{t("search")}</span>
        <input
          id={searchId}
          className="input"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="chip-row" aria-live="polite">
        {selectedIds.map((id) => (
          <SelectedReferenceChip
            id={id}
            key={id}
            kind={kind}
            fallbackLabel={labels.get(id) ?? id}
            onRemove={() => removeReference(id)}
          />
        ))}
      </div>
      <div className="reference-option-list" role="listbox" aria-label={label}>
        {options.map((item) => {
          return (
            <button
              className="reference-option"
              key={item.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => addReference(item.id)}
            >
              {resourceLabel(item)}
            </button>
          );
        })}
      </div>
      <p className="muted">
        {t("selectedCount")}: {selectedIds.length} {t("countSuffix")}
      </p>
    </fieldset>
  );
}

function SelectedReferenceChip({
  id,
  kind,
  fallbackLabel,
  onRemove,
}: {
  id: string;
  kind: ResourceKind;
  fallbackLabel: string;
  onRemove: () => void;
}) {
  const detail = useResourceDetail(kind, id);
  const label = detail.data?.data ? resourceLabel(detail.data.data) : fallbackLabel;

  return (
    <span className="chip">
      {label}
      <button
        className="chip-remove"
        type="button"
        aria-label={`${label} ${t("remove")}`}
        onClick={onRemove}
      >
        ×
      </button>
    </span>
  );
}

function resourceLabel(item: { id: string; [key: string]: unknown }): string {
  if (typeof item.brandName === "string") {
    return `${item.brandName} / ${item.genericName ?? item.id} (${item.id})`;
  }
  if (typeof item.name === "string") {
    return `${item.name} (${item.id})`;
  }
  return item.id;
}
