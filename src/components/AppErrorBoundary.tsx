import { Component, type ErrorInfo, type ReactNode } from "react";
import { t } from "@/lib/i18n/messages";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="main-pane">
          <div className="notice notice-error" role="alert">
            {t("networkError")}
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
