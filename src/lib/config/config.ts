import { z } from "zod";

const publicConfigSchema = z.object({
  VITE_API_BASE_URL: z.url().startsWith("http://127.0.0.1:"),
  VITE_API_TIMEOUT_MS: z.coerce.number().int().positive(),
  VITE_ADMIN_TOKEN_PATH: z.string().startsWith("/"),
});

export type PublicConfig = {
  apiBaseUrl: string;
  apiTimeoutMs: number;
  adminTokenPath: string;
};

export function parsePublicConfig(env: Record<string, unknown>): PublicConfig {
  const parsed = publicConfigSchema.parse(env);

  return {
    apiBaseUrl: parsed.VITE_API_BASE_URL,
    apiTimeoutMs: parsed.VITE_API_TIMEOUT_MS,
    adminTokenPath: parsed.VITE_ADMIN_TOKEN_PATH,
  };
}

let cachedConfig: PublicConfig | undefined;

export function getPublicConfig(): PublicConfig {
  cachedConfig ??= parsePublicConfig(readPublicEnv());
  return cachedConfig;
}

export function resetPublicConfigForTests(): void {
  cachedConfig = undefined;
}

export function setPublicConfigForTests(config: PublicConfig): void {
  cachedConfig = config;
}

function readPublicEnv(): Record<string, unknown> {
  const runtimeProcess = (globalThis as { process?: { env?: Record<string, unknown> } }).process;
  return { ...import.meta.env, ...(runtimeProcess?.env ?? {}) };
}
