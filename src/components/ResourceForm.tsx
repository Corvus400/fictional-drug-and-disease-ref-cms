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
import { ErrorNotice } from "./ErrorNotice";
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
    const patch = (buildDirtyPatch(parsed.data, form.formState.dirtyFields) ??
      {}) as Partial<FormValue>;
    save.mutate(
      {
        data: parsed.data as FormValue,
        patch,
      },
      {
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
      },
    );
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
        {save.error ? <ErrorNotice error={save.error} /> : null}
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

function buildDirtyPatch(value: unknown, dirty: unknown): unknown {
  if (dirty === true) {
    return value;
  }
  if (dirty === undefined || dirty === false || dirty === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== "object" || value === null || typeof dirty !== "object") {
    return undefined;
  }

  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(dirty)) {
    const child = buildDirtyPatch(
      (value as Record<string, unknown>)[key],
      (dirty as Record<string, unknown>)[key],
    );
    if (child !== undefined) {
      patch[key] = child;
    }
  }
  return Object.keys(patch).length === 0 ? undefined : patch;
}

function DrugFields({ selfId }: { selfId?: string }) {
  return (
    <>
      <Section title="基本情報">
        <TextField name="brandName" label="販売名" required />
        <TextField name="genericName" label="一般名" required />
        <TextField name="brandNameKana" label="販売名カナ" required />
        <TextField name="atcCode" label="ATC コード" required />
        <TextField name="yjCode" label="日本標準商品分類番号" />
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
      <Section title="組成・用法">
        <JsonField name="composition" label="組成・性状 JSON" />
        <JsonField name="dosage" label="用法・用量 JSON" />
        <JsonField name="dosageRelatedPrecautions" label="用法用量に関連する注意 JSON" />
        <JsonField name="indications" label="効能・効果 JSON" />
        <JsonField name="indicationsRelatedPrecautions" label="効能効果に関連する注意 JSON" />
      </Section>
      <Section title="安全性・注意">
        <JsonField name="warning" label="警告 JSON" />
        <JsonField name="contraindications" label="禁忌 JSON" />
        <JsonField name="importantPrecautions" label="重要な基本的注意 JSON" />
        <JsonField name="precautionsForSpecificPopulations" label="特定背景患者注意 JSON" />
        <JsonField name="interactions" label="相互作用 JSON" />
        <JsonField name="adverseReactions" label="副作用 JSON" />
        <JsonField name="effectsOnLabTests" label="臨床検査結果に及ぼす影響 JSON" />
        <JsonField name="overdose" label="過量投与 JSON" />
        <JsonField name="administrationPrecautions" label="適用上の注意 JSON" />
        <JsonField name="otherPrecautions" label="その他の注意 JSON" />
      </Section>
      <Section title="薬理・補助情報">
        <JsonField name="pharmacokinetics" label="薬物動態 JSON" />
        <JsonField name="clinicalResults" label="臨床成績 JSON" />
        <JsonField name="pharmacology" label="薬効薬理 JSON" />
        <JsonField name="physicochemicalProperties" label="理化学的知見 JSON" />
        <JsonField name="handlingPrecautions" label="取扱い上の注意 JSON" />
        <JsonField name="approvalConditions" label="承認条件 JSON" />
        <JsonField name="packages" label="包装 JSON" />
        <JsonField name="references" label="主要文献 JSON" />
        <JsonField name="insuranceNotes" label="保険給付上の注意 JSON" />
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
        <FieldArrayEditor name="synonyms" label="別名・同義語" />
      </Section>
      <Section title="疾患情報">
        <TextAreaField name="summary" label="概説" required />
        <TextAreaField name="etiology" label="原因・病態" required />
        <JsonField name="epidemiology" label="疫学 JSON" />
        <JsonField name="symptoms" label="症状 JSON" />
        <JsonField name="diagnosticCriteria" label="診断基準 JSON" />
        <JsonField name="requiredExams" label="必須検査 JSON" />
        <JsonField name="severityGrading" label="重症度分類 JSON" />
        <FieldArrayEditor name="differentialDiagnoses" label="鑑別診断" />
        <FieldArrayEditor name="complications" label="合併症" />
        <JsonField name="treatments" label="治療 JSON" />
        <TextAreaField name="prognosis" label="予後" />
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
      yjCode: "",
      therapeuticCategoryName: "",
      regulatoryClass: ["ordinary"],
      dosageForm: "tablet",
      routeOfAdministration: "oral",
      composition: {
        activeIngredient: "",
        activeIngredientAmount: { amount: 0, unit: "mg", per: "" },
        inactiveIngredients: [],
        appearance: "",
        identificationCode: "",
      },
      warning: [],
      contraindications: [{ order: 1, content: "" }],
      indications: [{ order: 1, content: "" }],
      indicationsRelatedPrecautions: [],
      dosage: {
        standardDosage: "",
        ageSpecificDosage: [],
        renalAdjustment: [],
        hepaticAdjustment: [],
      },
      dosageRelatedPrecautions: [],
      importantPrecautions: [],
      precautionsForSpecificPopulations: [],
      interactions: null,
      adverseReactions: {
        serious: [],
        other: {
          over5Percent: [],
          between1And5Percent: [],
          under1Percent: [],
          frequencyUnknown: [],
        },
      },
      effectsOnLabTests: [],
      overdose: null,
      administrationPrecautions: [],
      otherPrecautions: [],
      pharmacokinetics: null,
      clinicalResults: [],
      pharmacology: null,
      physicochemicalProperties: null,
      handlingPrecautions: [],
      approvalConditions: [],
      packages: [
        {
          size: "",
          storageCondition: {
            temperature: "room_temperature",
            lightProtection: false,
            moistureProtection: false,
            additionalNote: "",
          },
          expirationMonths: 36,
        },
      ],
      references: [],
      insuranceNotes: [],
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
    synonyms: [],
    summary: "",
    epidemiology: {
      prevalence: null,
      onsetAgeRange: null,
      sexRatio: null,
      riskFactors: [],
    },
    etiology: "",
    symptoms: { mainSymptoms: [""], associatedSymptoms: [], onsetPattern: "acute" },
    diagnosticCriteria: { required: [""], supporting: [], notes: "" },
    requiredExams: [
      {
        name: "",
        category: "blood_test",
        typicalFinding: "",
        referenceRange: "",
      },
    ],
    severityGrading: null,
    differentialDiagnoses: [],
    complications: [],
    treatments: {
      pharmacological: [],
      nonPharmacological: [],
      acutePhaseProtocol: [],
    },
    prognosis: "",
    prevention: [],
    relatedDrugIds: [],
    relatedDiseaseIds: [],
    ...value,
  } satisfies Partial<DiseaseRequest>;
}
