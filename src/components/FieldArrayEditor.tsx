import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

type FieldArrayEditorProps = {
  name: string;
  label: string;
  required?: boolean;
};

export function FieldArrayEditor({ name, label, required = false }: FieldArrayEditorProps) {
  const { control, register } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name,
  });

  return (
    <fieldset className="field-group">
      <legend>
        {label} <span className="field-hint">{required ? "必須" : "任意"}</span>
      </legend>
      <div className="stack">
        {fields.map((field, index) => (
          <div className="array-row" key={field.id}>
            <input
              aria-label={`${label} ${index + 1}`}
              className="input"
              {...register(`${name}.${index}`)}
            />
            <button
              aria-label={`${label} ${index + 1} を上へ`}
              className="icon-button"
              type="button"
              onClick={() => index > 0 && move(index, index - 1)}
            >
              ↑
            </button>
            <button
              aria-label={`${label} ${index + 1} を削除`}
              className="icon-button"
              type="button"
              onClick={() => remove(index)}
            >
              <Trash2 aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
      </div>
      <button className="button button-secondary" type="button" onClick={() => append("")}>
        <Plus aria-hidden="true" size={16} />
        {label}を追加
      </button>
    </fieldset>
  );
}
