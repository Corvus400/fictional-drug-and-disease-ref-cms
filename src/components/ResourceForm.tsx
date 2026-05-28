import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useBlocker } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, type Path, type Resolver, useForm, useFormContext } from "react-hook-form";
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
import { formatOption, type MessageKey, t } from "@/lib/i18n/messages";
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
    resolver: standardSchemaResolver(schema as never, undefined, {
      raw: true,
    }) as unknown as Resolver<FormRecord>,
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
    const data = schema.parse(value) as FormValue;
    const patch = (buildDirtyPatch(data, form.formState.dirtyFields) ?? {}) as Partial<FormValue>;
    save.mutate(
      {
        data,
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
  const { watch } = useFormContext();
  const dosageForm = watch("dosageForm");
  const route = watch("routeOfAdministration");
  const regulatoryClass = (watch("regulatoryClass") as string[] | undefined) ?? [];
  const atcCode = String(watch("atcCode") ?? "");
  const injectable = dosageForm === "injection_form" || route === "injection_route";
  const external = [
    "ointment",
    "cream",
    "patch",
    "eye_drops",
    "nasal_spray",
    "suppository",
  ].includes(String(dosageForm));
  const needsWarning = regulatoryClass.some((item) =>
    ["poison", "potent", "biological", "specified_biological"].includes(item),
  );
  const needsHandling = regulatoryClass.some((item) =>
    ["biological", "specified_biological"].includes(item),
  );
  const needsInsurance = regulatoryClass.some((item) =>
    ["narcotic", "psychotropic_1", "psychotropic_2", "psychotropic_3"].includes(item),
  );
  const needsDosageRelatedPrecaution = atcCode.startsWith("A") || atcCode.startsWith("C");

  return (
    <>
      <Section titleKey="basicInfo">
        <TextField name="brandName" labelKey="brandName" required />
        <TextField name="genericName" labelKey="genericName" required />
        <TextField name="brandNameKana" labelKey="brandNameKana" required />
        <TextField name="atcCode" labelKey="atcCode" required />
        <TextField name="yjCode" labelKey="yjCode" />
        <TextField name="therapeuticCategoryName" labelKey="therapeuticCategoryName" required />
        <SelectField name="dosageForm" labelKey="dosageForm" options={dosageForms} />
        <SelectField
          name="routeOfAdministration"
          labelKey="routeOfAdministration"
          options={routeOfAdministration}
        />
        <MultiSelectField
          name="regulatoryClass"
          labelKey="regulatoryClass"
          options={regulatoryClasses}
        />
        <TextField name="manufacturer" labelKey="manufacturer" required />
      </Section>
      <Section titleKey="drugCompositionDosage">
        <TextField name="composition.activeIngredient" labelKey="activeIngredient" required />
        <NumberField
          name="composition.activeIngredientAmount.amount"
          labelKey="activeIngredientAmount"
          required
        />
        <SelectField
          name="composition.activeIngredientAmount.unit"
          labelKey="doseUnit"
          options={["mg", "g", "microgram", "ml", "l", "iu", "meq", "mol", "mmol", "percent"]}
        />
        <TextField name="composition.activeIngredientAmount.per" labelKey="dosePer" />
        <FieldArrayEditor name="composition.inactiveIngredients" labelKey="inactiveIngredients" />
        <TextField name="composition.appearance" labelKey="appearance" required />
        <TextField name="composition.identificationCode" labelKey="identificationCode" />
        <TextAreaField name="dosage.standardDosage" labelKey="standardDosage" required />
        <FieldArrayEditor
          name="dosage.ageSpecificDosage"
          labelKey="ageSpecificDosage"
          appendValue={{ range: { label: "" }, dose: "" }}
          fields={[
            { name: "range.label", labelKey: "rangeLabel" },
            { name: "dose", labelKey: "dose", type: "textarea" },
          ]}
        />
        <FieldArrayEditor
          name="dosage.renalAdjustment"
          labelKey="renalAdjustment"
          appendValue={{ range: { severity: "normal", label: "" }, dose: "" }}
          fields={[
            { name: "range.label", labelKey: "rangeLabel" },
            {
              name: "range.severity",
              labelKey: "severity",
              type: "select",
              options: ["normal", "mild", "moderate", "severe", "end_stage"],
            },
            { name: "dose", labelKey: "dose", type: "textarea" },
          ]}
        />
        <FieldArrayEditor
          name="dosage.hepaticAdjustment"
          labelKey="hepaticAdjustment"
          appendValue={{ severity: "mild", dose: "" }}
          fields={[
            {
              name: "severity",
              labelKey: "severity",
              type: "select",
              options: ["mild", "moderate", "severe"],
            },
            { name: "dose", labelKey: "dose", type: "textarea" },
          ]}
        />
        <NumberedParagraphEditor
          name="dosageRelatedPrecautions"
          labelKey="dosageRelatedPrecautions"
          required={needsDosageRelatedPrecaution}
        />
        <IndicationEditor name="indications" labelKey="indications" required />
        <NumberedParagraphEditor
          name="indicationsRelatedPrecautions"
          labelKey="indicationsRelatedPrecautions"
        />
      </Section>
      <Section titleKey="drugSafety">
        <NumberedParagraphEditor name="warning" labelKey="warning" required={needsWarning} />
        <NumberedParagraphEditor name="contraindications" labelKey="contraindications" required />
        <NumberedParagraphEditor name="importantPrecautions" labelKey="importantPrecautions" />
        <FieldArrayEditor
          name="precautionsForSpecificPopulations"
          labelKey="precautionsForSpecificPopulations"
          appendValue={{ category: "comorbidity", note: "" }}
          fields={[
            {
              name: "category",
              labelKey: "category",
              type: "select",
              options: [
                "comorbidity",
                "renal_impairment",
                "hepatic_impairment",
                "reproductive_potential",
                "pregnant",
                "lactating",
                "pediatric",
                "geriatric",
              ],
            },
            { name: "note", labelKey: "note", type: "textarea" },
          ]}
        />
        <FieldArrayEditor
          name="interactions.combinationProhibited"
          labelKey="interactionsProhibited"
          appendValue={{ displayName: "", clinicalSymptom: "", mechanism: "" }}
          fields={interactionFields}
        />
        <FieldArrayEditor
          name="interactions.combinationCaution"
          labelKey="interactionsCaution"
          appendValue={{ displayName: "", clinicalSymptom: "", mechanism: "" }}
          fields={interactionFields}
        />
        <AdverseReactionFields />
        <NumberedParagraphEditor name="effectsOnLabTests" labelKey="effectsOnLabTests" />
        <TextAreaField name="overdose.symptoms" labelKey="overdoseSymptoms" />
        <TextAreaField name="overdose.management" labelKey="overdoseManagement" />
        <NumberedParagraphEditor
          name="administrationPrecautions"
          labelKey="administrationPrecautions"
          required={injectable || external}
        />
        <NumberedParagraphEditor name="otherPrecautions" labelKey="otherPrecautions" />
      </Section>
      <Section titleKey="drugSupplement">
        {injectable ? (
          <>
            <TextAreaField
              name="pharmacokinetics.bloodConcentration"
              labelKey="bloodConcentration"
              required
            />
            <TextAreaField name="pharmacokinetics.metabolism" labelKey="metabolism" />
            <TextAreaField name="pharmacokinetics.excretion" labelKey="excretion" />
          </>
        ) : null}
        <TextAreaField name="pharmacokinetics.absorption" labelKey="absorption" />
        <TextAreaField name="pharmacokinetics.distribution" labelKey="distribution" />
        <FieldArrayEditor
          name="pharmacokinetics.parameters"
          labelKey="pkParameters"
          appendValue={{ name: "", value: "" }}
          fields={[
            { name: "name", labelKey: "parameterName" },
            { name: "value", labelKey: "parameterValue" },
          ]}
        />
        <FieldArrayEditor
          name="clinicalResults"
          labelKey="clinicalResults"
          appendValue={{ heading: "", content: "" }}
          fields={[
            { name: "heading", labelKey: "heading" },
            { name: "content", labelKey: "content", type: "textarea" },
          ]}
        />
        <TextAreaField name="pharmacology.mechanism" labelKey="pharmacologyMechanism" />
        <TextAreaField name="pharmacology.effect" labelKey="pharmacologyEffect" />
        <TextField
          name="physicochemicalProperties.genericNameEnglish"
          labelKey="genericNameEnglish"
        />
        <TextField name="physicochemicalProperties.molecularFormula" labelKey="molecularFormula" />
        <NumberField name="physicochemicalProperties.molecularWeight" labelKey="molecularWeight" />
        <TextAreaField name="physicochemicalProperties.description" labelKey="description" />
        <NumberedParagraphEditor
          name="handlingPrecautions"
          labelKey="handlingPrecautions"
          required={needsHandling}
        />
        <NumberedParagraphEditor name="approvalConditions" labelKey="approvalConditions" />
        <PackageEditor />
        <FieldArrayEditor
          name="references"
          labelKey="references"
          appendValue={{ citation: "", source: "" }}
          fields={[
            { name: "citation", labelKey: "citation" },
            { name: "source", labelKey: "source" },
          ]}
        />
        <NumberedParagraphEditor
          name="insuranceNotes"
          labelKey="insuranceNotes"
          required={needsInsurance}
        />
      </Section>
      <Section titleKey="relatedResources">
        <ReferencePicker
          name="relatedDiseaseIds"
          labelKey="relatedDiseases"
          kind="diseases"
          selfId={selfId}
        />
      </Section>
    </>
  );
}

function DiseaseFields({ selfId }: { selfId?: string }) {
  const { watch } = useFormContext();
  const icd10Chapter = watch("icd10Chapter");
  const chronicity = watch("chronicity");
  const infectious = watch("infectious");
  const needsEpidemiology = icd10Chapter === "chapter_i" || icd10Chapter === "chapter_xv";
  const needsSeverity = icd10Chapter === "chapter_ii" || icd10Chapter === "chapter_ix";
  const needsPrognosis = icd10Chapter === "chapter_ii";
  const needsAcuteProtocol = icd10Chapter === "chapter_ix" && chronicity === "acute";
  const needsPrevention = infectious === true;

  return (
    <>
      <Section titleKey="basicInfo">
        <TextField name="name" labelKey="diseaseName" required />
        <TextField name="nameKana" labelKey="diseaseNameKana" required />
        <TextField name="nameEnglish" labelKey="diseaseNameEnglish" />
        <SelectField name="icd10Chapter" labelKey="icd10Chapter" options={icd10Chapters} />
        <SelectField name="chronicity" labelKey="chronicity" options={chronicities} />
        <CheckboxField name="infectious" labelKey="infectious" />
        <MultiSelectField
          name="medicalDepartment"
          labelKey="medicalDepartment"
          options={medicalDepartments}
        />
        <FieldArrayEditor name="synonyms" labelKey="synonyms" />
      </Section>
      <Section titleKey="diseaseInfo">
        <TextAreaField name="summary" labelKey="summary" required />
        <TextAreaField name="etiology" labelKey="etiology" required />
        {needsEpidemiology ? <EpidemiologyFields required /> : <EpidemiologyFields />}
        <FieldArrayEditor name="symptoms.mainSymptoms" labelKey="mainSymptoms" required />
        <FieldArrayEditor name="symptoms.associatedSymptoms" labelKey="associatedSymptoms" />
        {icd10Chapter === "chapter_i" ? (
          <SelectField
            name="symptoms.onsetPattern"
            labelKey="onsetPattern"
            options={["acute", "subacute", "chronic", "intermittent", "relapsing"]}
          />
        ) : null}
        <FieldArrayEditor name="diagnosticCriteria.required" labelKey="requiredCriteria" required />
        <FieldArrayEditor name="diagnosticCriteria.supporting" labelKey="supportingCriteria" />
        <TextAreaField name="diagnosticCriteria.notes" labelKey="criteriaNotes" />
        <ExamEditor />
        {needsSeverity ? <SeverityEditor required /> : <SeverityEditor />}
        <FieldArrayEditor name="differentialDiagnoses" labelKey="differentialDiagnoses" />
        <FieldArrayEditor name="complications" labelKey="complications" />
        <TreatmentFields needsAcuteProtocol={needsAcuteProtocol} />
        <TextAreaField name="prognosis" labelKey="prognosis" required={needsPrognosis} />
        <FieldArrayEditor name="prevention" labelKey="prevention" required={needsPrevention} />
      </Section>
      <Section titleKey="relatedResources">
        <ReferencePicker name="relatedDrugIds" labelKey="relatedDrugs" kind="drugs" />
        <ReferencePicker
          name="relatedDiseaseIds"
          labelKey="relatedDiseases"
          kind="diseases"
          selfId={selfId}
        />
      </Section>
    </>
  );
}

const interactionFields = [
  { name: "displayName", labelKey: "displayName" },
  { name: "clinicalSymptom", labelKey: "clinicalSymptom", type: "textarea" },
  { name: "mechanism", labelKey: "mechanism", type: "textarea" },
] satisfies React.ComponentProps<typeof FieldArrayEditor>["fields"];

function NumberedParagraphEditor({
  name,
  labelKey,
  required = false,
}: {
  name: string;
  labelKey: MessageKey;
  required?: boolean;
}) {
  return (
    <FieldArrayEditor
      name={name}
      labelKey={labelKey}
      required={required}
      appendValue={{ order: 1, content: "" }}
      fields={[
        { name: "order", labelKey: "order", type: "number" },
        { name: "content", labelKey: "content", type: "textarea" },
      ]}
    />
  );
}

function IndicationEditor({
  name,
  labelKey,
  required = false,
}: {
  name: string;
  labelKey: MessageKey;
  required?: boolean;
}) {
  return (
    <FieldArrayEditor
      name={name}
      labelKey={labelKey}
      required={required}
      appendValue={{ order: 1, content: "" }}
      fields={[
        { name: "order", labelKey: "order", type: "number" },
        { name: "content", labelKey: "content", type: "textarea" },
      ]}
    />
  );
}

function AdverseReactionFields() {
  return (
    <>
      <FieldArrayEditor
        name="adverseReactions.serious"
        labelKey="seriousAdverseReactions"
        appendValue={{
          name: "",
          frequency: "unknown",
          symptom: "",
          initialSigns: "",
          countermeasure: "",
        }}
        fields={[
          { name: "name", labelKey: "adverseReactionName" },
          {
            name: "frequency",
            labelKey: "frequency",
            type: "select",
            options: ["over_5_percent", "between_1_and_5_percent", "under_1_percent", "unknown"],
          },
          { name: "symptom", labelKey: "symptom", type: "textarea" },
          { name: "initialSigns", labelKey: "initialSigns" },
          { name: "countermeasure", labelKey: "countermeasure", type: "textarea" },
        ]}
      />
      <FieldArrayEditor name="adverseReactions.other.over5Percent" labelKey="adverseOver5" />
      <FieldArrayEditor
        name="adverseReactions.other.between1And5Percent"
        labelKey="adverseBetween1And5"
      />
      <FieldArrayEditor name="adverseReactions.other.under1Percent" labelKey="adverseUnder1" />
      <FieldArrayEditor name="adverseReactions.other.frequencyUnknown" labelKey="adverseUnknown" />
    </>
  );
}

function PackageEditor() {
  return (
    <FieldArrayEditor
      name="packages"
      labelKey="packages"
      required
      appendValue={{
        size: "",
        storageCondition: {
          temperature: "room_temperature",
          lightProtection: false,
          moistureProtection: false,
          additionalNote: "",
        },
        expirationMonths: 36,
      }}
      fields={[
        { name: "size", labelKey: "packageSize" },
        {
          name: "storageCondition.temperature",
          labelKey: "storageTemperature",
          type: "select",
          options: ["room_temperature", "cold", "frozen"],
        },
        { name: "storageCondition.lightProtection", labelKey: "lightProtection", type: "checkbox" },
        {
          name: "storageCondition.moistureProtection",
          labelKey: "moistureProtection",
          type: "checkbox",
        },
        { name: "storageCondition.additionalNote", labelKey: "storageAdditionalNote" },
        { name: "expirationMonths", labelKey: "expirationMonths", type: "number" },
      ]}
    />
  );
}

function EpidemiologyFields({ required = false }: { required?: boolean }) {
  return (
    <fieldset className="field-group field-wide">
      <legend>
        {t("epidemiology")}{" "}
        <span className="field-hint">{required ? t("required") : t("optional")}</span>
      </legend>
      <NumberField name="epidemiology.prevalence.rate" labelKey="prevalenceRate" />
      <NumberField name="epidemiology.prevalence.denominator" labelKey="prevalenceDenominator" />
      <SelectField
        name="epidemiology.prevalence.unit"
        labelKey="prevalenceUnit"
        options={["per_population", "per_patient", "per_birth"]}
      />
      <TextField name="epidemiology.prevalence.label" labelKey="prevalence" />
      <NumberField name="epidemiology.onsetAgeRange.minAgeYears" labelKey="minAgeYears" />
      <NumberField name="epidemiology.onsetAgeRange.maxAgeYears" labelKey="maxAgeYears" />
      <TextField name="epidemiology.onsetAgeRange.label" labelKey="onsetAgeRange" />
      <NumberField name="epidemiology.sexRatio.maleRatio" labelKey="maleRatio" />
      <NumberField name="epidemiology.sexRatio.femaleRatio" labelKey="femaleRatio" />
      <TextField name="epidemiology.sexRatio.note" labelKey="note" />
      <FieldArrayEditor
        name="epidemiology.riskFactors"
        labelKey="riskFactors"
        required={required}
      />
    </fieldset>
  );
}

function ExamEditor() {
  return (
    <FieldArrayEditor
      name="requiredExams"
      labelKey="requiredExams"
      required
      appendValue={{ name: "", category: "blood_test", typicalFinding: "", referenceRange: "" }}
      fields={[
        { name: "name", labelKey: "examName" },
        {
          name: "category",
          labelKey: "examCategory",
          type: "select",
          options: ["blood_test", "imaging", "physiological", "pathology", "interview"],
        },
        { name: "typicalFinding", labelKey: "typicalFinding" },
        { name: "referenceRange", labelKey: "referenceRange" },
      ]}
    />
  );
}

function SeverityEditor({ required = false }: { required?: boolean }) {
  return (
    <fieldset className="field-group field-wide">
      <legend>
        {t("severityGrading")}{" "}
        <span className="field-hint">{required ? t("required") : t("optional")}</span>
      </legend>
      <TextField
        name="severityGrading.gradingSystem"
        labelKey="gradingSystem"
        required={required}
      />
      <FieldArrayEditor
        name="severityGrading.grades"
        labelKey="grades"
        required={required}
        appendValue={{ label: "", criteria: "", recommendedAction: "" }}
        fields={[
          { name: "label", labelKey: "gradeLabel" },
          { name: "criteria", labelKey: "gradeCriteria" },
          { name: "recommendedAction", labelKey: "recommendedAction", type: "textarea" },
        ]}
      />
    </fieldset>
  );
}

function TreatmentFields({ needsAcuteProtocol }: { needsAcuteProtocol: boolean }) {
  return (
    <fieldset className="field-group field-wide">
      <legend>{t("treatments")}</legend>
      <FieldArrayEditor
        name="treatments.pharmacological"
        labelKey="pharmacologicalTreatments"
        appendValue={{ drugCategory: "", drugIds: [], indication: "", notes: "" }}
        fields={[
          { name: "drugCategory", labelKey: "drugCategory" },
          { name: "indication", labelKey: "indication" },
          { name: "notes", labelKey: "treatmentNotes", type: "textarea" },
        ]}
      />
      <FieldArrayEditor
        name="treatments.nonPharmacological"
        labelKey="nonPharmacologicalTreatments"
        appendValue={{ heading: "", items: [], description: "" }}
        fields={[
          { name: "heading", labelKey: "heading" },
          { name: "description", labelKey: "treatmentDescription", type: "textarea" },
        ]}
      />
      <FieldArrayEditor
        name="treatments.acutePhaseProtocol"
        labelKey="acutePhaseProtocol"
        required={needsAcuteProtocol}
        appendValue={{ order: 1, action: "", target: "" }}
        fields={[
          { name: "order", labelKey: "order", type: "number" },
          { name: "action", labelKey: "action", type: "textarea" },
          { name: "target", labelKey: "target" },
        ]}
      />
    </fieldset>
  );
}

function Section({ titleKey, children }: { titleKey: MessageKey; children: React.ReactNode }) {
  return (
    <section className="section-panel">
      <h2>{t(titleKey)}</h2>
      <div className="field-grid">{children}</div>
    </section>
  );
}

function TextField({ name, labelKey, required = false, type = "text" }: FieldProps) {
  const { formState, register } = useFormContext();
  const error = getFieldError(formState.errors, name);
  const label = t(labelKey);
  const registerOptions =
    type === "number"
      ? { setValueAs: (value: unknown) => (value === "" ? undefined : Number(value)) }
      : undefined;
  return (
    <label className="field">
      <span>
        {label} <span className="field-hint">{required ? t("required") : t("optional")}</span>
      </span>
      <input
        type={type}
        className="input"
        {...register(name, registerOptions)}
        aria-invalid={error === undefined ? undefined : true}
      />
      <FieldError name={name} />
    </label>
  );
}

function NumberField(props: FieldProps) {
  return <TextField {...props} type="number" />;
}

function TextAreaField({ name, labelKey, required = false }: FieldProps) {
  const { register } = useFormContext();
  const label = t(labelKey);
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

function SelectField({ name, labelKey, options }: FieldProps & { options: readonly string[] }) {
  const { register } = useFormContext();
  const label = t(labelKey);
  return (
    <label className="field">
      <span>
        {label} <span className="field-hint">{t("required")}</span>
      </span>
      <select className="input" {...register(name)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
      <FieldError name={name} />
    </label>
  );
}

function MultiSelectField({
  name,
  labelKey,
  options,
}: FieldProps & { options: readonly string[] }) {
  const { register } = useFormContext();
  const label = t(labelKey);
  return (
    <label className="field">
      <span>
        {label} <span className="field-hint">{t("required")}</span>
      </span>
      <select className="input multi" multiple {...register(name)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
      <FieldError name={name} />
    </label>
  );
}

function CheckboxField({ name, labelKey }: FieldProps) {
  const { register } = useFormContext();
  return (
    <label className="checkbox-field">
      <input type="checkbox" {...register(name)} />
      {t(labelKey)}
    </label>
  );
}

function FieldError({ name }: { name: string }) {
  const { formState } = useFormContext();
  const error = getFieldError(formState.errors, name);
  return error?.message !== undefined ? (
    <span className="field-error" role="alert">
      {String(error.message)}
    </span>
  ) : null;
}

function getFieldError(errors: unknown, name: string): { message?: unknown } | undefined {
  let current = errors;
  for (const segment of name.split(".")) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "object" && current !== null
    ? (current as { message?: unknown })
    : undefined;
}

type FieldProps = {
  name: string;
  labelKey: MessageKey;
  required?: boolean;
  type?: "text" | "number";
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
