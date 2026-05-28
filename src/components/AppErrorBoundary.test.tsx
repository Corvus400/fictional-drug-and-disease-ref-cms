import type { ErrorInfo } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

describe("AppErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts bearer tokens before logging uncaught errors", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const boundary = new AppErrorBoundary({ children: null });

    boundary.componentDidCatch(
      new Error("Request failed: Authorization: Bearer header.payload.signature"),
      { componentStack: "at AdminPanel" } as ErrorInfo,
    );

    expect(consoleError).toHaveBeenCalledWith(
      "Request failed: Authorization: Bearer [REDACTED]",
      "at AdminPanel",
    );
  });
});
