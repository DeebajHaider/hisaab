import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/error-reporting";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render errors anywhere in the child tree and shows a friendly
 * fallback instead of the default blank screen with a stack trace.
 *
 * Errors are logged with the component stack so they remain debuggable
 * in production even without access to source maps.
 *
 * Place once around the route tree. For section-level isolation you can
 * nest additional instances — each catches only its own subtree.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { componentStack: info.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mt-1">
              An unexpected error occurred. Refreshing usually fixes it — if
              it keeps happening, something needs looking at.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button onClick={() => window.location.reload()}>
              Refresh page
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Go home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
