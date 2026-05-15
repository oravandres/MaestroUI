import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";

interface RouteErrorBoundaryState {
  error: Error | null;
}

interface RouteErrorBoundaryProps extends PropsWithChildren {
  fallbackTitle?: string;
}

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== "undefined") {
      console.error("[RouteErrorBoundary]", error, info.componentStack);
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  private reload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const message = error.message ?? "";
    const isChunkError = /chunk|loading|dynamic import|failed to fetch|import\(\)/i.test(message);

    return (
      <div className="state-panel state-panel-error route-error" role="alert">
        <h2>{this.props.fallbackTitle ?? "Page failed to load"}</h2>
        <p>
          {isChunkError
            ? "We couldn't load this page's code. This usually happens after a deploy — reloading the page fixes it."
            : message || "Something went wrong while rendering this page."}
        </p>
        <div className="button-row">
          <button type="button" className="button button-secondary" onClick={this.reset}>
            Retry
          </button>
          <button type="button" className="button button-primary" onClick={this.reload}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
