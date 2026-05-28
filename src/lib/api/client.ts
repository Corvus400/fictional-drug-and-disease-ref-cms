import type { z } from "zod";
import { getPublicConfig } from "@/lib/config/config";
import { parseProblemDetails, problemToAppError } from "@/lib/errors/problem";
import type { AppError, Result } from "@/lib/errors/types";
import { getAccessToken, setAccessToken } from "@/lib/security/token-store";

type ApiFetchOptions<T> = {
  path: string;
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
  schema?: z.ZodType<T>;
  retryAuth?: boolean;
};

export type ApiValue<T> = {
  data: T;
  etag?: string;
};

export async function apiFetch<T>(options: ApiFetchOptions<T>): Promise<Result<ApiValue<T>>> {
  const config = getPublicConfig();
  const token = getAccessToken() ?? (await mintToken());
  const headers = new Headers(options.headers);

  if (token !== undefined) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), config.apiTimeoutMs);

  try {
    const response = await fetch(`${config.apiBaseUrl}${options.path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body instanceof FormData
          ? options.body
          : options.body === undefined
            ? undefined
            : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (response.status === 401 && options.retryAuth !== false) {
      const refreshedToken = await mintToken(true);
      if (refreshedToken === undefined) {
        return { ok: false, error: { kind: "unauthorized", message: "Authentication failed." } };
      }
      setAccessToken(refreshedToken);
      return apiFetch({ ...options, retryAuth: false });
    }

    if (!response.ok) {
      return { ok: false, error: await responseToError(response) };
    }

    if (response.status === 204 || options.schema === undefined) {
      return {
        ok: true,
        value: { data: undefined as T, etag: response.headers.get("ETag") ?? undefined },
      };
    }

    const json = (await response.json()) as unknown;
    const parsed = options.schema.safeParse(json);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          kind: "unexpected",
          message: "API response schema mismatch.",
          cause: parsed.error,
        },
      };
    }

    return {
      ok: true,
      value: {
        data: parsed.data,
        etag: response.headers.get("ETag") ?? undefined,
      },
    };
  } catch (cause) {
    return { ok: false, error: { kind: "network", message: "Network request failed.", cause } };
  } finally {
    window.clearTimeout(timeout);
  }
}

async function responseToError(response: Response): Promise<AppError> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/problem+json")) {
    const problem = parseProblemDetails(await response.json());
    if (problem !== undefined) {
      return problemToAppError(problem);
    }
  }

  return problemToAppError({
    status: response.status,
    title: response.statusText,
  });
}

async function mintToken(force = false): Promise<string | undefined> {
  const existing = getAccessToken();
  if (!force && existing !== undefined) {
    return existing;
  }

  const config = getPublicConfig();
  const response = await fetch(`${config.apiBaseUrl}${config.adminTokenPath}`, {
    method: "POST",
  });

  if (!response.ok) {
    return undefined;
  }

  const json = (await response.json()) as unknown;
  const token =
    typeof json === "object" && json !== null && "token" in json && typeof json.token === "string"
      ? json.token
      : undefined;
  if (token !== undefined) {
    setAccessToken(token);
  }
  return token;
}
