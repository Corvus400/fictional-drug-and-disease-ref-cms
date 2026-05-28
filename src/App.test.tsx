import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("App shell", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:19090");
    vi.stubEnv("VITE_API_TIMEOUT_MS", "10000");
    vi.stubEnv("VITE_ADMIN_TOKEN_PATH", "/v1/admin/token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/v1/admin/token")) {
          return Response.json({ token: "test-token" });
        }
        return Response.json({
          items: [],
          page: 1,
          pageSize: 20,
          totalPages: 1,
          totalCount: 0,
        });
      }),
    );
  });

  it("renders the CMS application shell", async () => {
    render(<App />);

    expect(
      await screen.findByRole("link", {
        name: "架空医薬品・疾患リファレンス CMS",
      }),
    ).toBeInTheDocument();
  });
});
