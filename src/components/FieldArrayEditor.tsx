import { ArrowUp, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { formatOption, type MessageKey, t } from "@/lib/i18n/messages";

type FieldArrayEditorProps = {
  name: string;
  labelKey: MessageKey;
  required?: boolean;
  appendValue?: unknown;
  fields?: Array<{
    name: string;
    labelKey: MessageKey;
    type?: "text" | "number" | "checkbox" | "textarea" | "select";
    options?: readonly string[];
  }>;
};

export function FieldArrayEditor({
  name,
  labelKey,
  required = false,
  appendValue = "",
  fields: rowFields,
}: FieldArrayEditorProps) {
  const { control, register } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name,
  });
  const label = t(labelKey);

  return (
    <fieldset className="field-group">
      <legend>
        {label} <span className="field-hint">{required ? t("required") : t("optional")}</span>
      </legend>
      <div className="stack">
        {fields.map((field, index) => (
          <div className="array-row" key={field.id}>
            {rowFields === undefined ? (
              <input
                aria-label={`${label} ${index + 1}`}
                className="input"
                {...register(`${name}.${index}`)}
              />
            ) : (
              <div className="nested-grid">
                {rowFields.map((rowField) => {
                  const fieldName = `${name}.${index}.${rowField.name}`;
                  const fieldLabel = t(rowField.labelKey);
                  if (rowField.type === "checkbox") {
                    return (
                      <label className="checkbox-field" key={fieldName}>
                        <input type="checkbox" {...register(fieldName)} />
                        {fieldLabel}
                      </label>
                    );
                  }
                  if (rowField.type === "select" && rowField.options !== undefined) {
                    return (
                      <label className="field" key={fieldName}>
                        <span>{fieldLabel}</span>
                        <select className="input" {...register(fieldName)}>
                          {rowField.options.map((option) => (
                            <option key={option} value={option}>
                              {formatOption(option)}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }
                  const inputType = rowField.type === "number" ? "number" : "text";
                  const inputId = fieldName.replaceAll(".", "-");
                  const registerOptions =
                    rowField.type === "number"
                      ? {
                          setValueAs: (value: unknown) =>
                            value === "" ? undefined : Number(value),
                        }
                      : undefined;
                  const commonProps = {
                    "aria-label": `${label} ${index + 1} ${fieldLabel}`,
                    className: "input",
                    id: inputId,
                    ...register(fieldName, registerOptions),
                  };
                  return (
                    <label className="field" htmlFor={inputId} key={fieldName}>
                      <span>{fieldLabel}</span>
                      {rowField.type === "textarea" ? (
                        <textarea
                          className="input textarea"
                          id={inputId}
                          {...register(fieldName)}
                        />
                      ) : (
                        <input type={inputType} {...commonProps} />
                      )}
                    </label>
                  );
                })}
              </div>
            )}
            <button
              aria-label={`${label} ${index + 1} ${t("moveUp")}`}
              className="icon-button"
              type="button"
              onClick={() => index > 0 && move(index, index - 1)}
            >
              <ArrowUp aria-hidden="true" size={16} />
            </button>
            <button
              aria-label={`${label} ${index + 1} ${t("remove")}`}
              className="icon-button"
              type="button"
              onClick={() => remove(index)}
            >
              <Trash2 aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
      </div>
      <button className="button button-secondary" type="button" onClick={() => append(appendValue)}>
        <Plus aria-hidden="true" size={16} />
        {`${label}${t("add")}`}
      </button>
    </fieldset>
  );
}
