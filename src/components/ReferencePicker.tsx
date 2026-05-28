import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useResourceList } from "@/lib/api/resources";
import type { ResourceKind } from "@/lib/api/schema";

type ReferencePickerProps = {
  name: string;
  label: string;
  kind: ResourceKind;
  selfId?: string;
};

export function ReferencePicker({ name, label, kind, selfId }: ReferencePickerProps) {
  const { register, watch } = useFormContext();
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
      <p className="muted">選択中: {selected.size} 件</p>
    </fieldset>
  );
}
