import { describe, expect, it } from "vitest";
import { problemToAppError, toFormPath } from "./problem";

describe("problem+json mapping", () => {
  it("maps 422 field violations to validation AppError fields", () => {
    const error = problemToAppError({
      status: 422,
      title: "Validation failed",
      errors: [{ field: "composition.activeIngredients[0].amount", reason: "required" }],
    });

    expect(error).toEqual({
      kind: "validation",
      message: "入力内容を確認してください。",
      fields: [{ field: "composition.activeIngredients.0.amount", message: "required" }],
    });
  });

  it("maps 412 to conflict without treating it as reference conflict", () => {
    expect(problemToAppError({ status: 412, title: "Precondition Failed" }).kind).toBe("conflict");
  });

  it("converts bracket paths to React Hook Form dot paths", () => {
    expect(toFormPath("items[2].name")).toBe("items.2.name");
  });

  it("converts backend snake case field paths to React Hook Form camel case paths", () => {
    expect(toFormPath("generic_name")).toBe("genericName");
    expect(toFormPath("related_disease_ids[0]")).toBe("relatedDiseaseIds.0");
    expect(toFormPath("composition.active_ingredient_amount.amount")).toBe(
      "composition.activeIngredientAmount.amount",
    );
  });
});
