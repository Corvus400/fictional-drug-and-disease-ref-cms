import { describe, expect, it } from "vitest";
import { isPngFileSignature } from "./ImageUploader";

describe("isPngFileSignature", () => {
  it("accepts only files with the PNG magic number", async () => {
    const png = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "image.png",
      { type: "image/png" },
    );
    const mislabeled = new File([new Uint8Array([0x47, 0x49, 0x46, 0x38])], "image.png", {
      type: "image/png",
    });

    await expect(isPngFileSignature(png)).resolves.toBe(true);
    await expect(isPngFileSignature(mislabeled)).resolves.toBe(false);
  });
});
