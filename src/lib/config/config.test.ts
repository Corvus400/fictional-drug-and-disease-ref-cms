import { describe, expect, it } from "vitest";
import { parsePublicConfig } from "./config";

describe("parsePublicConfig", () => {
  it("returns typed CMS config from valid Vite env values", () => {
    const config = parsePublicConfig({
      VITE_API_BASE_URL: "http://127.0.0.1:19090",
      VITE_API_TIMEOUT_MS: "10000",
      VITE_ADMIN_TOKEN_PATH: "/v1/admin/token",
    });

    expect(config).toEqual({
      apiBaseUrl: "http://127.0.0.1:19090",
      apiTimeoutMs: 10000,
      adminTokenPath: "/v1/admin/token",
    });
  });
});
