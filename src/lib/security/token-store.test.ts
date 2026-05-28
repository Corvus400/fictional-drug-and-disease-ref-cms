import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, getAccessToken, redactToken, setAccessToken } from "./token-store";

describe("in-memory token store", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearAccessToken();
  });

  it("keeps the admin token only in module memory", () => {
    const localStorageMock = { getItem: vi.fn(), setItem: vi.fn() };
    const sessionStorageMock = { getItem: vi.fn(), setItem: vi.fn() };
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("sessionStorage", sessionStorageMock);

    setAccessToken("header.payload.signature");

    expect(getAccessToken()).toBe("header.payload.signature");
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("redacts bearer tokens from loggable strings", () => {
    expect(redactToken("Authorization: Bearer header.payload.signature")).toBe(
      "Authorization: Bearer [REDACTED]",
    );
  });
});
