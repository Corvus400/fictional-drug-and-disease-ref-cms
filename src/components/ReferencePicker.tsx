import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useResourceList } from "@/lib/api/resources";
import type { ResourceKind } from "@/lib/api/schema";
import { type MessageKey, t } from "@/lib/i18n/messages";

type ReferencePickerProps = {
  name: string;
  labelKey: MessageKey;
  kind: ResourceKind;
  selfId?: string;
};

export function ReferencePicker({ name, labelKey, kind, selfId }: ReferencePickerProps) {
  const { register, watch } = useFormContext();
  const label = t(labelKey);
  const selected = new Set((watch(name) as string[] | undefined) ?? []);
  const list = useResourceList(kind, { page: 1, pageSize: 100 });
  const options = useMemo(
    () => list.data?.items.filter((item) => item.id !== selfId) ?? [],
    [list.data?.items, selfId],
  );

  return (
    <fieldset className="field-group">
      <legend>{label}</legend>
      <select aria-label={label} className="input" multiple {...register(name)}>
        {options.map((item) => {
          const displayName =
            "brandName" in item
              ? `${item.brandName ?? item.id} (${item.id})`
              : `${item.name ?? item.id} (${item.id})`;
          return (
            <option key={item.id} value={item.id}>
              {displayName}
            </option>
          );
        })}
      </select>
      <p className="muted">
        {t("selectedCount")}: {selected.size} {t("countSuffix")}
      </p>
    </fieldset>
  );
}
