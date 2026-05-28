import { redactToken } from "@/lib/security/token-store";

export function installGlobalErrorCapture(): () => void {
  const handleError = (event: ErrorEvent) => {
    reportLocalError(event.error ?? event.message);
  };
  const handleRejection = (event: PromiseRejectionEvent) => {
    reportLocalError(event.reason);
  };

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
  };
}

function reportLocalError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(redactToken(message));
}
