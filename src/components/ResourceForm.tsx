import { useBlocker } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, type Path, useForm, useFormContext } from "react-hook-form";
import { useSaveResource } from "@/lib/api/resources";
import {
  chronicities,
  type Disease,
  type DiseaseRequest,
  type Drug,
  type DrugRequest,
  diseaseRequestSchema,
  dosageForms,
  drugRequestSchema,
  icd10Chapters,
  medicalDepartments,
  type ResourceKind,
  regulatoryClasses,
  routeOfAdministration,
} from "@/lib/api/schema";
import { t } from "@/lib/i18n/messages";
import { FieldArrayEditor } from "./FieldArrayEditor";
import { ReferencePicker } from "./ReferencePicker";

type ResourceFormProps = {
  kind: ResourceKind;
  initialValue?: Drug | Disease;
  etag?: string;
  onSaved?: (id: string) => void;
};

type FormValue = DrugRequest | DiseaseRequest;
type FormRecord = Record<string, unknown>;

export function ResourceForm({ kind, initialValue, etag, onSaved }: ResourceFormProps) {
  const schema = kind === "drugs" ? drugRequestSchema : diseaseRequestSchema;
  const form = useForm<FormRecord>({
    defaultValues: toDefaultValue(kind, initialValue) as FormRecord,
    mode: "onBlur",
  });
  const save = useSaveResource(kind, initialValue?.id, etag);
  useBlocker({
    shouldBlockFn: () => form.formState.isDirty && !window.confirm(t("unsaved")),
  });

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!form.formState.isDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.formState.isDirty]);

  function submit(value: FormRecord) {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        form.setError(issue.path.join(".") as Path<FormRecord>, { message: issue.message });
      }
      return;
    }
    save.mutate(parsed.data as FormValue, {
      onSuccess: (saved) => {
        form.reset(toDefaultValue(kind, saved) as FormRecord);
        onSaved?.(saved.id);
      },
      onError: (error) => {
        if (typeof error === "object" && error !== null && "fields" in error) {
          const fields = error.fields as Array<{ field: string; message: string }>;
          for (const field of fields) {
            form.setError(field.field as Path<FormRecord>, { message: field.message });
          }
        }
      },
    });
  }

  return (
    <FormProvider {...form}>
      <form className="form-grid" onSubmit={form.handleSubmit(submit)}>
        {form.formState.isDirty ? (
          <p className="notice" aria-live="polite">
            {t("unsaved")}
          </p>
        ) : null}
        {kind === "drugs" ? (
          <DrugFields selfId={initialValue?.id} />
        ) : (
          <DiseaseFields selfId={initialValue?.id} />
        )}
        <div className="button-row sticky-actions">
          <button className="button button-primary" type="submit" disabled={save.isPending}>
            <Save aria-hidden="true" size={16} />
            {save.isPending ? t("loading") : t("save")}
          </button>
          {save.isSuccess ? (
            <span className="success" aria-live="polite">
              {t("saved")}
            </span>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}

function DrugFields({ selfId }: { selfId?: string }) {
  return (
    <>
      <Section title="基本情報">
        <TextField name="brandName" label="販売名" required />
        <TextField name="genericName" label="一般名" required />
        <TextField name="brandNameKana" label="販売名カナ" required />
        <TextField name="atcCode" label="ATC コード" required />
        <TextField name="therapeuticCategoryName" label="薬効分類名" required />
        <SelectField name="dosageForm" label="剤形" options={dosageForms} />
        <SelectField
          name="routeOfAdministration"
          label="投与経路"
          options={routeOfAdministration}
        />
        <MultiSelectField name="regulatoryClass" label="規制区分" options={regulatoryClasses} />
        <TextField name="manufacturer" label="製造販売業者" required />
      </Section>
      <Section title="添付文書セクション">
        <JsonField name="composition" label="組成・性状 JSON" />
        <JsonField name="dosage" label="用法・用量 JSON" />
        <JsonField name="pharmacokinetics" label="薬物動態 JSON" />
        <FieldArrayEditor name="warning" label="警告" />
        <FieldArrayEditor name="contraindications" label="禁忌" required />
        <FieldArrayEditor name="indications" label="効能・効果" />
        <FieldArrayEditor name="administrationPrecautions" label="適用上の注意" />
        <FieldArrayEditor name="handlingPrecautions" label="取扱い上の注意" />
        <FieldArrayEditor name="packages" label="包装" required />
      </Section>
      <Section title="関連リソース">
        <ReferencePicker
          name="relatedDiseaseIds"
          label="関連疾患"
          kind="diseases"
          selfId={selfId}
        />
      </Section>
    </>
  );
}

function DiseaseFields({ selfId }: { selfId?: string }) {
  return (
    <>
      <Section title="基本情報">
        <TextField name="name" label="疾患名" required />
        <TextField name="nameKana" label="疾患名カナ" required />
        <TextField name="nameEnglish" label="英語名" />
        <SelectField name="icd10Chapter" label="ICD-10 章" options={icd10Chapters} />
        <SelectField name="chronicity" label="慢性度" options={chronicities} />
        <CheckboxField name="infectious" label="感染性" />
        <MultiSelectField name="medicalDepartment" label="診療科" options={medicalDepartments} />
      </Section>
      <Section title="疾患情報">
        <TextAreaField name="summary" label="概説" required />
        <TextAreaField name="etiology" label="原因・病態" required />
        <JsonField name="epidemiology" label="疫学 JSON" />
        <JsonField name="treatments" label="治療 JSON" />
        <FieldArrayEditor name="symptoms.mainSymptoms" label="主症状" required />
        <FieldArrayEditor name="diagnosticCriteria.required" label="診断基準" required />
        <FieldArrayEditor name="requiredExams" label="必須検査" required />
        <FieldArrayEditor name="prevention" label="予防" />
      </Section>
      <Section title="関連リソース">
        <ReferencePicker name="relatedDrugIds" label="関連医薬品" kind="drugs" />
        <ReferencePicker
          name="relatedDiseaseIds"
          label="関連疾患"
          kind="diseases"
          selfId={selfId}
        />
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="section-panel">
      <h2>{title}</h2>
      <div className="field-grid">{children}</div>
    </section>
  );
}

function TextField({ name, label, required = false }: FieldProps) {
  const { formState, register } = useFormContext();
  const error = formState.errors[name];
  return (
    <label className="field">
      <span>
        {label} <span className="field-hint">{required ? t("required") : t("optional")}</span>
      </span>
      <input
        className="input"
        {...register(name)}
        aria-invalid={error === undefined ? undefined : true}
      />
      <FieldError name={name} />
    </label>
  );
}

function TextAreaField({ name, label, required = false }: FieldProps) {
  const { register } = useFormContext();
  return (
    <label className="field field-wide">
      <span>
        {label} <span className="field-hint">{required ? t("required") : t("optional")}</span>
      </span>
      <textarea className="input textarea" {...register(name)} />
      <FieldError name={name} />
    </label>
  );
}

function JsonField({ name, label }: FieldProps) {
  const { setValue, watch } = useFormContext();
  return (
    <label className="field field-wide">
      <span>
        {label} <span className="field-hint">{t("optional")}</span>
      </span>
      <textarea
        className="input textarea monospace"
        defaultValue={JSON.stringify(watch(name) ?? {}, null, 2)}
        onBlur={(event) => {
          try {
            setValue(name, JSON.parse(event.currentTarget.value), { shouldDirty: true });
          } catch {
            setValue(name, {}, { shouldDirty: true });
          }
        }}
        name={`${name}.__json`}
      />
      <FieldError name={name} />
    </label>
  );
}

function SelectField({ name, label, options }: FieldProps & { options: readonly string[] }) {
  const { register } = useFormContext();
  return (
    <label className="field">
      <span>
        {label} <span className="field-hint">{t("required")}</span>
      </span>
      <select className="input" {...register(name)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FieldError name={name} />
    </label>
  );
}

function MultiSelectField({ name, label, options }: FieldProps & { options: readonly string[] }) {
  const { register } = useFormContext();
  return (
    <label className="field">
      <span>
        {label} <span className="field-hint">{t("required")}</span>
      </span>
      <select className="input multi" multiple {...register(name)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FieldError name={name} />
    </label>
  );
}

function CheckboxField({ name, label }: FieldProps) {
  const { register } = useFormContext();
  return (
    <label className="checkbox-field">
      <input type="checkbox" {...register(name)} />
      {label}
    </label>
  );
}

function FieldError({ name }: { name: string }) {
  const { formState } = useFormContext();
  const error = formState.errors[name];
  return error?.message !== undefined ? (
    <span className="field-error" role="alert">
      {String(error.message)}
    </span>
  ) : null;
}

type FieldProps = {
  name: string;
  label: string;
  required?: boolean;
};

function toDefaultValue(kind: ResourceKind, value?: Drug | Disease): Partial<FormValue> {
  if (kind === "drugs") {
    return {
      genericName: "",
      brandName: "",
      brandNameKana: "",
      atcCode: "A00AA00",
      therapeuticCategoryName: "",
      regulatoryClass: ["ordinary"],
      dosageForm: "tablet",
      routeOfAdministration: "oral",
      composition: {},
      warning: [],
      contraindications: [""],
      indications: [""],
      dosage: {},
      administrationPrecautions: [],
      handlingPrecautions: [],
      packages: [""],
      manufacturer: "",
      relatedDiseaseIds: [],
      ...value,
    } satisfies Partial<DrugRequest>;
  }

  return {
    name: "",
    nameKana: "",
    nameEnglish: "",
    icd10Chapter: "chapter_i",
    medicalDepartment: ["internal_medicine"],
    chronicity: "acute",
    infectious: true,
    summary: "",
    epidemiology: {},
    etiology: "",
    symptoms: { mainSymptoms: [""] },
    diagnosticCriteria: { required: [""] },
    requiredExams: [""],
    treatments: {},
    prevention: [],
    relatedDrugIds: [],
    relatedDiseaseIds: [],
    ...value,
  } satisfies Partial<DiseaseRequest>;
}
