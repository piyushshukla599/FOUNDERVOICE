"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg space-y-3 px-4 py-16 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Something went wrong</h2>
          <p className="text-sm text-[var(--muted)]">
            Reload the page. Your recordings stay on this machine — nothing was sent to the cloud.
          </p>
          <button
            type="button"
            className="rounded-xl bg-[var(--emerald)] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
