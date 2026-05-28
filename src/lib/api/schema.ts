import { z } from "zod";
import { t } from "@/lib/i18n/messages";

export const dosageForms = [
  "tablet",
  "capsule",
  "powder",
  "granule",
  "liquid",
  "injection_form",
  "ointment",
  "cream",
  "patch",
  "eye_drops",
  "suppository",
  "inhaler",
  "nasal_spray",
] as const;

export const routeOfAdministration = [
  "oral",
  "topical",
  "injection_route",
  "inhalation",
  "rectal",
  "ophthalmic",
  "nasal",
  "transdermal",
] as const;

export const regulatoryClasses = [
  "poison",
  "potent",
  "ordinary",
  "psychotropic_1",
  "psychotropic_2",
  "psychotropic_3",
  "narcotic",
  "stimulant_precursor",
  "biological",
  "specified_biological",
  "prescription_required",
] as const;

export const icd10Chapters = Array.from(
  { length: 22 },
  (_, index) => `chapter_${toRoman(index + 1)}`,
) as [string, ...string[]];

export const medicalDepartments = [
  "internal_medicine",
  "cardiology",
  "gastroenterology",
  "endocrinology",
  "neurology",
  "psychiatry",
  "surgery",
  "orthopedics",
  "dermatology",
  "ophthalmology",
  "otolaryngology",
  "urology",
  "gynecology",
  "pediatrics",
  "emergency",
  "infectious_disease",
] as const;

export const chronicities = ["acute", "subacute", "chronic", "relapsing"] as const;

const doseUnits = [
  "mg",
  "g",
  "microgram",
  "ml",
  "l",
  "iu",
  "meq",
  "mol",
  "mmol",
  "percent",
] as const;
const storageTemperatures = ["room_temperature", "cold", "frozen"] as const;
const precautionPopulationCategories = [
  "comorbidity",
  "renal_impairment",
  "hepatic_impairment",
  "reproductive_potential",
  "pregnant",
  "lactating",
  "pediatric",
  "geriatric",
] as const;
const renalSeverities = ["normal", "mild", "moderate", "severe", "end_stage"] as const;
const hepaticSeverities = ["mild", "moderate", "severe"] as const;
const frequencyBands = [
  "over_5_percent",
  "between_1_and_5_percent",
  "under_1_percent",
  "unknown",
] as const;
const onsetPatterns = ["acute", "subacute", "chronic", "intermittent", "relapsing"] as const;
const prevalenceUnits = ["per_population", "per_patient", "per_birth"] as const;
const examCategories = [
  "blood_test",
  "imaging",
  "physiological",
  "pathology",
  "interview",
] as const;

export const precautionCategories = precautionPopulationCategories;
export const onsetPatternOptions = onsetPatterns;
export const examCategoryOptions = examCategories;

const nonEmptyString = z.string().trim().min(1);
const optionalString = z
  .string()
  .nullable()
  .optional()
  .transform((value) => value ?? "");
const stringArray = z.array(z.string().trim()).default([]);
const nonEmptyStringArray = z.array(nonEmptyString).min(1);

function isEmptyFormValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isEmptyFormValue);
  }
  if (typeof value === "object") {
    return Object.values(value).every(isEmptyFormValue);
  }
  return false;
}

function blankObjectToNull<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (isEmptyFormValue(value) ? null : value),
    schema.nullable().optional(),
  );
}

const numberedParagraphSchema = z.object({
  order: z.coerce.number().int().positive(),
  subOrder: z.coerce.number().int().positive().nullable().optional(),
  content: nonEmptyString,
});

const indicationItemSchema = z.object({
  order: z.coerce.number().int().positive(),
  content: nonEmptyString,
});

const doseSchema = z.object({
  amount: z.coerce.number(),
  unit: z.enum(doseUnits),
  per: optionalString,
});

const compositionSchema = z.object({
  activeIngredient: nonEmptyString,
  activeIngredientAmount: doseSchema,
  inactiveIngredients: stringArray,
  appearance: nonEmptyString,
  identificationCode: optionalString,
});

const ageRangeSchema = z.object({
  minAgeMonths: z.coerce.number().int().nullable().optional(),
  maxAgeMonths: z.coerce.number().int().nullable().optional(),
  label: nonEmptyString,
});

const crClRangeSchema = z.object({
  minMlPerMin: z.coerce.number().int().nullable().optional(),
  maxMlPerMin: z.coerce.number().int().nullable().optional(),
  severity: z.enum(renalSeverities),
  label: nonEmptyString,
});

const dosageSchema = z.object({
  standardDosage: nonEmptyString,
  ageSpecificDosage: z.array(z.object({ range: ageRangeSchema, dose: nonEmptyString })).default([]),
  renalAdjustment: z.array(z.object({ range: crClRangeSchema, dose: nonEmptyString })).default([]),
  hepaticAdjustment: z
    .array(z.object({ severity: z.enum(hepaticSeverities), dose: nonEmptyString }))
    .default([]),
});

const precautionPopulationSchema = z.object({
  category: z.enum(precautionPopulationCategories),
  note: nonEmptyString,
});

const interactionEntrySchema = z.object({
  drugId: optionalString,
  displayName: nonEmptyString,
  clinicalSymptom: nonEmptyString,
  mechanism: nonEmptyString,
});

const interactionSchema = z.object({
  combinationProhibited: z.array(interactionEntrySchema).default([]),
  combinationCaution: z.array(interactionEntrySchema).default([]),
});

const adverseReactionSchema = z.object({
  name: nonEmptyString,
  frequency: z.enum(frequencyBands),
  symptom: nonEmptyString,
  initialSigns: nonEmptyString,
  countermeasure: nonEmptyString,
});

const adverseReactionByFrequencySchema = z.object({
  over5Percent: stringArray,
  between1And5Percent: stringArray,
  under1Percent: stringArray,
  frequencyUnknown: stringArray,
});

const adverseReactionsSchema = z.object({
  serious: z.array(adverseReactionSchema).default([]),
  other: adverseReactionByFrequencySchema,
});

const pharmacokineticsSchema = z.object({
  bloodConcentration: optionalString,
  absorption: optionalString,
  distribution: optionalString,
  metabolism: optionalString,
  excretion: optionalString,
  parameters: z.array(z.object({ name: nonEmptyString, value: nonEmptyString })).default([]),
});

const packageSchema = z.object({
  size: nonEmptyString,
  storageCondition: z.object({
    temperature: z.enum(storageTemperatures),
    lightProtection: z.boolean(),
    moistureProtection: z.boolean(),
    additionalNote: optionalString,
  }),
  expirationMonths: z.coerce.number().int().positive(),
});

const referenceSchema = z.object({
  citation: nonEmptyString,
  source: optionalString,
});

const examSchema = z.object({
  name: nonEmptyString,
  category: z.enum(examCategories),
  typicalFinding: nonEmptyString,
  referenceRange: optionalString,
});

const epidemiologySchema = z.object({
  prevalence: z.preprocess(
    (value) => (isEmptyFormValue(value) ? null : value),
    z
      .object({
        rate: z.coerce.number().nullable().optional(),
        denominator: z.coerce.number().int().nullable().optional(),
        unit: z.enum(prevalenceUnits).default("per_population"),
        label: nonEmptyString,
      })
      .nullable()
      .optional(),
  ),
  onsetAgeRange: z.preprocess(
    (value) => (isEmptyFormValue(value) ? null : value),
    z
      .object({
        minAgeYears: z.coerce.number().int().nullable().optional(),
        maxAgeYears: z.coerce.number().int().nullable().optional(),
        label: nonEmptyString,
      })
      .nullable()
      .optional(),
  ),
  sexRatio: z.preprocess(
    (value) => (isEmptyFormValue(value) ? null : value),
    z
      .object({
        maleRatio: z.coerce.number().int(),
        femaleRatio: z.coerce.number().int(),
        note: optionalString,
      })
      .nullable()
      .optional(),
  ),
  riskFactors: stringArray,
});

const symptomsSchema = z.object({
  mainSymptoms: nonEmptyStringArray,
  associatedSymptoms: stringArray,
  onsetPattern: z.enum(onsetPatterns).nullable().optional(),
});

const diagnosticCriteriaSchema = z.object({
  required: nonEmptyStringArray,
  supporting: stringArray,
  notes: optionalString,
});

const severitySchema = z.object({
  gradingSystem: nonEmptyString,
  grades: z
    .array(
      z.object({
        label: nonEmptyString,
        criteria: nonEmptyString,
        recommendedAction: nonEmptyString,
      }),
    )
    .min(2),
});

const treatmentsSchema = z.object({
  pharmacological: z
    .array(
      z.object({
        drugCategory: nonEmptyString,
        drugIds: stringArray,
        indication: nonEmptyString,
        notes: nonEmptyString,
      }),
    )
    .default([]),
  nonPharmacological: z
    .array(
      z.object({
        heading: nonEmptyString,
        items: stringArray,
        description: optionalString,
      }),
    )
    .default([]),
  acutePhaseProtocol: z
    .array(
      z.object({
        order: z.coerce.number().int().positive(),
        action: nonEmptyString,
        target: optionalString,
      }),
    )
    .default([]),
});

const drugFieldsSchema = z.object({
  genericName: nonEmptyString,
  brandName: nonEmptyString,
  brandNameKana: nonEmptyString,
  atcCode: z.string().regex(/^[ABCDGHJLMNPRSV][0-9]{2}[A-Z][A-Z][0-9]{2}$/),
  yjCode: optionalString,
  therapeuticCategoryName: nonEmptyString,
  regulatoryClass: z.array(z.enum(regulatoryClasses)).min(1),
  dosageForm: z.enum(dosageForms),
  routeOfAdministration: z.enum(routeOfAdministration),
  composition: compositionSchema,
  warning: z.array(numberedParagraphSchema).default([]),
  contraindications: z.array(numberedParagraphSchema).min(1),
  indications: z.array(indicationItemSchema).min(1),
  indicationsRelatedPrecautions: z.array(numberedParagraphSchema).default([]),
  dosage: dosageSchema,
  dosageRelatedPrecautions: z.array(numberedParagraphSchema).default([]),
  importantPrecautions: z.array(numberedParagraphSchema).default([]),
  precautionsForSpecificPopulations: z.array(precautionPopulationSchema).default([]),
  interactions: interactionSchema.nullable().optional(),
  adverseReactions: adverseReactionsSchema,
  effectsOnLabTests: z.array(numberedParagraphSchema).default([]),
  overdose: blankObjectToNull(z.object({ symptoms: nonEmptyString, management: nonEmptyString })),
  administrationPrecautions: z.array(numberedParagraphSchema).default([]),
  otherPrecautions: z.array(numberedParagraphSchema).default([]),
  pharmacokinetics: pharmacokineticsSchema.nullable().optional(),
  clinicalResults: z
    .array(z.object({ heading: nonEmptyString, content: nonEmptyString }))
    .default([]),
  pharmacology: blankObjectToNull(z.object({ mechanism: nonEmptyString, effect: nonEmptyString })),
  physicochemicalProperties: blankObjectToNull(
    z.object({
      genericNameEnglish: nonEmptyString,
      molecularFormula: nonEmptyString,
      molecularWeight: z.coerce.number().nullable().optional(),
      description: nonEmptyString,
    }),
  ),
  handlingPrecautions: z.array(numberedParagraphSchema).default([]),
  approvalConditions: z.array(numberedParagraphSchema).default([]),
  packages: z.array(packageSchema).min(1),
  references: z.array(referenceSchema).default([]),
  insuranceNotes: z.array(numberedParagraphSchema).default([]),
  manufacturer: nonEmptyString,
  relatedDiseaseIds: stringArray,
});

export const drugRequestSchema = drugFieldsSchema.superRefine((value, ctx) => {
  const externalForms = ["ointment", "cream", "patch", "eye_drops", "nasal_spray", "suppository"];
  const injectable =
    value.dosageForm === "injection_form" || value.routeOfAdministration === "injection_route";
  const needsAdministrationPrecaution = injectable || externalForms.includes(value.dosageForm);
  const biological = value.regulatoryClass.some((item) =>
    ["biological", "specified_biological"].includes(item),
  );
  const hazardous = value.regulatoryClass.some((item) => ["poison", "potent"].includes(item));
  const controlled = value.regulatoryClass.some((item) =>
    ["narcotic", "psychotropic_1", "psychotropic_2", "psychotropic_3"].includes(item),
  );
  const chronicLongTerm = value.atcCode.startsWith("A") || value.atcCode.startsWith("C");

  if (needsAdministrationPrecaution && value.administrationPrecautions.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["administrationPrecautions"],
      message: t("validationAdministrationPrecaution"),
    });
  }
  if (injectable) {
    if (value.pharmacokinetics == null) {
      ctx.addIssue({
        code: "custom",
        path: ["pharmacokinetics"],
        message: t("validationInjectionPharmacokinetics"),
      });
    } else {
      if (!value.pharmacokinetics.bloodConcentration) {
        ctx.addIssue({
          code: "custom",
          path: ["pharmacokinetics", "bloodConcentration"],
          message: t("validationBloodConcentration"),
        });
      }
      if (!value.pharmacokinetics.metabolism && !value.pharmacokinetics.excretion) {
        ctx.addIssue({
          code: "custom",
          path: ["pharmacokinetics", "metabolism"],
          message: t("validationMetabolismOrExcretion"),
        });
      }
    }
  }
  if (biological && value.handlingPrecautions.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["handlingPrecautions"],
      message: t("validationBiologicalHandling"),
    });
  }
  if ((biological || hazardous) && value.warning.length === 0) {
    ctx.addIssue({ code: "custom", path: ["warning"], message: t("validationWarningRequired") });
  }
  if (controlled && value.insuranceNotes.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["insuranceNotes"],
      message: t("validationControlledInsurance"),
    });
  }
  if (chronicLongTerm && value.dosageRelatedPrecautions.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["dosageRelatedPrecautions"],
      message: t("validationLongTermDosage"),
    });
  }
});

const diseaseFieldsSchema = z.object({
  name: nonEmptyString,
  nameKana: nonEmptyString,
  nameEnglish: optionalString,
  icd10Chapter: z.enum(icd10Chapters),
  medicalDepartment: z.array(z.enum(medicalDepartments)).min(1),
  chronicity: z.enum(chronicities),
  infectious: z.boolean(),
  synonyms: stringArray,
  summary: nonEmptyString,
  epidemiology: blankObjectToNull(epidemiologySchema),
  etiology: nonEmptyString,
  symptoms: symptomsSchema,
  diagnosticCriteria: diagnosticCriteriaSchema,
  requiredExams: z.array(examSchema).min(1),
  severityGrading: severitySchema.nullable().optional(),
  differentialDiagnoses: stringArray,
  complications: stringArray,
  treatments: treatmentsSchema,
  prognosis: optionalString,
  prevention: stringArray,
  relatedDrugIds: stringArray,
  relatedDiseaseIds: stringArray,
});

export const diseaseRequestSchema = diseaseFieldsSchema.superRefine((value, ctx) => {
  if (value.icd10Chapter === "chapter_i") {
    if (!value.infectious) {
      ctx.addIssue({
        code: "custom",
        path: ["infectious"],
        message: t("validationInfectiousTrue"),
      });
    }
    if (value.epidemiology == null) {
      ctx.addIssue({
        code: "custom",
        path: ["epidemiology"],
        message: t("validationInfectiousEpidemiology"),
      });
    }
    if (!value.symptoms.onsetPattern) {
      ctx.addIssue({
        code: "custom",
        path: ["symptoms", "onsetPattern"],
        message: t("validationInfectiousOnset"),
      });
    }
    if (value.prevention.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["prevention"],
        message: t("validationInfectiousPrevention"),
      });
    }
  }
  if (value.icd10Chapter === "chapter_ii") {
    if (value.severityGrading == null) {
      ctx.addIssue({
        code: "custom",
        path: ["severityGrading"],
        message: t("validationSeverityRequired"),
      });
    }
    if (!value.prognosis) {
      ctx.addIssue({
        code: "custom",
        path: ["prognosis"],
        message: t("validationPrognosisRequired"),
      });
    }
  }
  if (value.icd10Chapter === "chapter_iv" && value.treatments.pharmacological.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["treatments", "pharmacological"],
      message: t("validationEndocrineTreatment"),
    });
  }
  if (value.icd10Chapter === "chapter_v" && value.symptoms.mainSymptoms.length < 3) {
    ctx.addIssue({
      code: "custom",
      path: ["symptoms", "mainSymptoms"],
      message: t("validationChapterVSymptoms"),
    });
  }
  if (value.icd10Chapter === "chapter_ix") {
    if (value.severityGrading == null) {
      ctx.addIssue({
        code: "custom",
        path: ["severityGrading"],
        message: t("validationSeverityRequired"),
      });
    }
    if (!value.requiredExams.some((exam) => exam.category === "imaging")) {
      ctx.addIssue({
        code: "custom",
        path: ["requiredExams"],
        message: t("validationCardiologyImaging"),
      });
    }
    if (value.chronicity === "acute" && value.treatments.acutePhaseProtocol.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["treatments", "acutePhaseProtocol"],
        message: t("validationAcuteProtocol"),
      });
    }
  }
  if (value.icd10Chapter === "chapter_xv") {
    if (value.epidemiology == null) {
      ctx.addIssue({
        code: "custom",
        path: ["epidemiology"],
        message: t("validationEpidemiologyRequired"),
      });
    } else {
      if (value.epidemiology.onsetAgeRange == null) {
        ctx.addIssue({
          code: "custom",
          path: ["epidemiology", "onsetAgeRange"],
          message: t("validationOnsetAgeRequired"),
        });
      }
      if (value.epidemiology.sexRatio == null) {
        ctx.addIssue({
          code: "custom",
          path: ["epidemiology", "sexRatio"],
          message: t("validationSexRatioRequired"),
        });
      }
    }
  }
});

export const serverFieldsSchema = z.object({
  id: z.string(),
  revisedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  disclaimer: z.string().optional(),
});

export const drugDomainSchema = drugFieldsSchema
  .extend({
    indications: z.array(indicationItemSchema).default([]),
    contraindications: z.array(numberedParagraphSchema).default([]),
    packages: z.array(packageSchema).default([]),
  })
  .extend({
    id: z.string(),
    revisedAt: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    imageUrl: z.string().optional(),
    disclaimer: z.string().optional(),
  })
  .passthrough();

export const diseaseDomainSchema = diseaseFieldsSchema
  .extend(serverFieldsSchema.shape)
  .passthrough();

export const drugSchema = z.preprocess(camelizeDeep, drugDomainSchema);

export const diseaseSchema = z.preprocess(camelizeDeep, diseaseDomainSchema);

export const drugSummarySchema = z
  .object({
    id: z.string(),
    brandName: z.string().optional(),
    genericName: z.string().optional(),
    dosageForm: z.string().optional(),
    atcCode: z.string().optional(),
    imageUrl: z.string().optional(),
  })
  .passthrough();

export const drugWireSummarySchema = z.preprocess(camelizeDeep, drugSummarySchema);

export const diseaseSummarySchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    icd10Chapter: z.string().optional(),
    chronicity: z.string().optional(),
  })
  .passthrough();

export const diseaseWireSummarySchema = z.preprocess(camelizeDeep, diseaseSummarySchema);

export const drugListSchema = z
  .object({
    items: z.array(drugWireSummarySchema),
    page: z.number().int().optional(),
    page_size: z.number().int().optional(),
    pageSize: z.number().int().optional(),
    total_pages: z.number().int().optional(),
    totalPages: z.number().int().optional(),
    total_count: z.number().int().optional(),
    totalCount: z.number().int().optional(),
    disclaimer: z.string().optional(),
  })
  .passthrough()
  .transform((value) => camelizeDeep(value))
  .pipe(
    z
      .object({
        items: z.array(drugSummarySchema),
        page: z.number().int(),
        pageSize: z.number().int(),
        totalPages: z.number().int(),
        totalCount: z.number().int(),
        disclaimer: z.string().optional(),
      })
      .passthrough(),
  );

export const diseaseListSchema = z
  .object({
    items: z.array(diseaseWireSummarySchema),
    page: z.number().int().optional(),
    page_size: z.number().int().optional(),
    pageSize: z.number().int().optional(),
    total_pages: z.number().int().optional(),
    totalPages: z.number().int().optional(),
    total_count: z.number().int().optional(),
    totalCount: z.number().int().optional(),
    disclaimer: z.string().optional(),
  })
  .passthrough()
  .transform((value) => camelizeDeep(value))
  .pipe(
    z
      .object({
        items: z.array(diseaseSummarySchema),
        page: z.number().int(),
        pageSize: z.number().int(),
        totalPages: z.number().int(),
        totalCount: z.number().int(),
        disclaimer: z.string().optional(),
      })
      .passthrough(),
  );

export const categoriesSchema = z.preprocess(
  camelizeDeep,
  z
    .object({
      atc: z.array(z.object({ code: z.string(), label: z.string() })),
      therapeuticCategories: z.array(z.object({ id: z.string(), label: z.string() })),
      routeOfAdministration: z.array(z.string()),
      dosageForm: z.array(z.string()),
      regulatoryClass: z.array(z.string()),
      icd10Chapters: z.array(z.object({ roman: z.string(), code: z.string(), label: z.string() })),
      medicalDepartments: z.array(z.string()),
    })
    .passthrough(),
);

export function toWireValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toWireValue);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      toSnakeCase(key),
      toWireValue(child),
    ]);
    return Object.fromEntries(entries);
  }
  return value;
}

export function toDomainValue(value: unknown): unknown {
  return camelizeDeep(value);
}

function camelizeDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(camelizeDeep);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      toCamelCase(key),
      camelizeDeep(child),
    ]);
    return Object.fromEntries(entries);
  }
  return value;
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

export type DrugRequest = z.infer<typeof drugRequestSchema>;
export type DiseaseRequest = z.infer<typeof diseaseRequestSchema>;
export type Drug = z.infer<typeof drugDomainSchema>;
export type Disease = z.infer<typeof diseaseDomainSchema>;
export type DrugList = z.infer<typeof drugListSchema>;
export type DiseaseList = z.infer<typeof diseaseListSchema>;
export type ResourceKind = "drugs" | "diseases";

function toRoman(value: number): string {
  const numerals: Array<[number, string]> = [
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let remaining = value;
  let result = "";
  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}
