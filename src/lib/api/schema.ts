import { z } from "zod";

export const dosageForms = [
  "tablet",
  "capsule",
  "powder",
  "granule",
  "oral_solution",
  "injection_form",
  "ointment",
  "cream",
  "patch",
  "eye_drops",
  "nasal_spray",
  "suppository",
  "inhalation",
] as const;

export const routeOfAdministration = [
  "oral",
  "injection",
  "topical",
  "transdermal",
  "ophthalmic",
  "nasal",
  "rectal",
  "inhalation",
] as const;

export const regulatoryClasses = [
  "ordinary",
  "poison",
  "potent",
  "prescription_only",
  "habit_forming",
  "narcotic",
  "psychotropic_1",
  "psychotropic_2",
  "psychotropic_3",
  "biological",
  "specified_biological",
] as const;

export const icd10Chapters = Array.from(
  { length: 22 },
  (_, index) => `chapter_${toRoman(index + 1)}`,
);

export const medicalDepartments = [
  "internal_medicine",
  "cardiology",
  "respiratory_medicine",
  "gastroenterology",
  "endocrinology",
  "nephrology",
  "neurology",
  "psychiatry",
  "pediatrics",
  "surgery",
  "orthopedics",
  "dermatology",
  "ophthalmology",
  "otorhinolaryngology",
  "obstetrics_gynecology",
  "urology",
] as const;

export const chronicities = ["acute", "subacute", "chronic", "relapsing"] as const;

const nonEmptyString = z.string().trim().min(1);
const stringArrayBase = z.array(z.string().trim());
const stringArray = stringArrayBase.default([]);
const recordValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
]);

export const drugRequestSchema = z
  .object({
    genericName: nonEmptyString,
    brandName: nonEmptyString,
    brandNameKana: nonEmptyString,
    atcCode: z.string().regex(/^[ABCDGHJLMNPRSV][0-9]{2}[A-Z][A-Z][0-9]{2}$/),
    yjCode: z.string().optional().or(z.literal("")),
    therapeuticCategoryName: nonEmptyString,
    regulatoryClass: z.array(z.enum(regulatoryClasses)).min(1),
    dosageForm: z.enum(dosageForms),
    routeOfAdministration: z.enum(routeOfAdministration),
    composition: z.record(z.string(), recordValue).default({}),
    warning: stringArray,
    contraindications: stringArrayBase.min(1).default([""]),
    indications: stringArray,
    dosage: z.record(z.string(), recordValue).default({}),
    administrationPrecautions: stringArray,
    pharmacokinetics: z.record(z.string(), recordValue).optional(),
    handlingPrecautions: stringArray,
    packages: stringArrayBase.min(1).default([""]),
    manufacturer: nonEmptyString,
    relatedDiseaseIds: stringArray,
  })
  .superRefine((value, ctx) => {
    const injectable =
      value.dosageForm === "injection_form" || value.routeOfAdministration === "injection";
    const biological = value.regulatoryClass.some((item) =>
      ["biological", "specified_biological"].includes(item),
    );
    const hazardous = value.regulatoryClass.some((item) => ["poison", "potent"].includes(item));

    if (injectable && value.administrationPrecautions.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["administrationPrecautions"],
        message: "注射剤は適用上の注意が必要です。",
      });
    }
    if (injectable && value.pharmacokinetics === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["pharmacokinetics"],
        message: "注射剤は薬物動態が必要です。",
      });
    }
    if (biological && value.handlingPrecautions.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["handlingPrecautions"],
        message: "生物由来製品は取扱い上の注意が必要です。",
      });
    }
    if ((biological || hazardous) && value.warning.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["warning"],
        message: "警告が必要です。",
      });
    }
  });

export const diseaseRequestSchema = z
  .object({
    name: nonEmptyString,
    nameKana: nonEmptyString,
    nameEnglish: z.string().optional().or(z.literal("")),
    icd10Chapter: z.enum(icd10Chapters as [string, ...string[]]),
    medicalDepartment: z.array(z.enum(medicalDepartments)).min(1),
    chronicity: z.enum(chronicities),
    infectious: z.boolean(),
    summary: nonEmptyString,
    epidemiology: z.record(z.string(), recordValue).optional(),
    etiology: nonEmptyString,
    symptoms: z
      .object({
        mainSymptoms: stringArrayBase.min(1),
        onsetPattern: z.string().optional(),
      })
      .default({ mainSymptoms: [] }),
    diagnosticCriteria: z
      .object({
        required: stringArrayBase.min(1),
      })
      .default({ required: [] }),
    requiredExams: stringArrayBase.min(1).default([""]),
    treatments: z.record(z.string(), recordValue).default({}),
    prognosis: z.string().optional().or(z.literal("")),
    prevention: stringArray,
    relatedDrugIds: stringArray,
    relatedDiseaseIds: stringArray,
  })
  .superRefine((value, ctx) => {
    if (value.icd10Chapter === "chapter_i" && !value.infectious) {
      ctx.addIssue({
        code: "custom",
        path: ["infectious"],
        message: "ICD-10 第 I 章は感染性を true にしてください。",
      });
    }
    if (value.icd10Chapter === "chapter_i" && value.epidemiology === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["epidemiology"],
        message: "感染症は疫学情報が必要です。",
      });
    }
    if (value.icd10Chapter === "chapter_v" && value.symptoms.mainSymptoms.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["symptoms", "mainSymptoms"],
        message: "第 V 章は主症状を 3 件以上入力してください。",
      });
    }
  });

export const serverFieldsSchema = z.object({
  id: z.string(),
  revisedAt: z.string().optional(),
  disclaimer: z.string().optional(),
});

export const drugSchema = drugRequestSchema
  .extend({
    id: z.string(),
    revisedAt: z.string().optional(),
    imageUrl: z.string().optional(),
    disclaimer: z.string().optional(),
  })
  .passthrough();

export const diseaseSchema = diseaseRequestSchema.extend(serverFieldsSchema.shape).passthrough();

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

export const diseaseSummarySchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    icd10Chapter: z.string().optional(),
    chronicity: z.string().optional(),
  })
  .passthrough();

export const drugListSchema = z
  .object({
    items: z.array(drugSummarySchema),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
    totalCount: z.number().int(),
    disclaimer: z.string().optional(),
  })
  .passthrough();

export const diseaseListSchema = z
  .object({
    items: z.array(diseaseSummarySchema),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
    totalCount: z.number().int(),
    disclaimer: z.string().optional(),
  })
  .passthrough();

export type DrugRequest = z.infer<typeof drugRequestSchema>;
export type DiseaseRequest = z.infer<typeof diseaseRequestSchema>;
export type Drug = z.infer<typeof drugSchema>;
export type Disease = z.infer<typeof diseaseSchema>;
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
