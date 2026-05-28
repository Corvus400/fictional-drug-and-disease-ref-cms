import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { AppRouter } from "./routes/router";

export function App() {
  return (
    <AppErrorBoundary>
      <AppRouter />
    </AppErrorBoundary>
  );
}
