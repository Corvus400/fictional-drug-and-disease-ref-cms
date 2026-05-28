export type FieldError = {
  field: string;
  message: string;
};

export type ProblemDetails = {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Array<{ field: string; reason?: string; message?: string }>;
  [key: string]: unknown;
};

export type AppError =
  | { kind: "notFound"; message: string }
  | { kind: "validation"; message: string; fields: FieldError[] }
  | { kind: "conflict"; message: string; latest?: unknown }
  | { kind: "referenceConflict"; message: string; references?: unknown }
  | { kind: "unauthorized"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "rateLimited"; message: string; retryAfterSeconds?: number }
  | { kind: "network"; message: string; cause?: unknown }
  | { kind: "unexpected"; message: string; cause?: unknown };

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
