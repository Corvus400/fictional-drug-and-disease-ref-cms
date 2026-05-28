import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken } from "@/lib/security/token-store";
import { apiFetch } from "./client";

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearAccessToken();
  });

  it("returns a network AppError when token minting fails", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:19090");
    vi.stubEnv("VITE_API_TIMEOUT_MS", "5000");
    vi.stubEnv("VITE_ADMIN_TOKEN_PATH", "/v1/admin/token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      }),
    );

    const result = await apiFetch({ path: "/v1/drugs" });

    expect(result).toMatchObject({ ok: false, error: { kind: "network" } });
  });
});
