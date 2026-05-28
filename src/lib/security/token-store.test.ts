import { afterEach, describe, expect, it } from "vitest";
import { clearAccessToken, getAccessToken, redactToken, setAccessToken } from "./token-store";

describe("in-memory token store", () => {
  afterEach(() => clearAccessToken());

  it("keeps the admin token only in module memory", () => {
    setAccessToken("header.payload.signature");

    expect(getAccessToken()).toBe("header.payload.signature");
    expect(window.localStorage.getItem("accessToken")).toBeNull();
    expect(window.sessionStorage.getItem("accessToken")).toBeNull();
  });

  it("redacts bearer tokens from loggable strings", () => {
    expect(redactToken("Authorization: Bearer header.payload.signature")).toBe(
      "Authorization: Bearer [REDACTED]",
    );
  });
});
