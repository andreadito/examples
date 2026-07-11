import { Component } from 'react';
import type { ReactNode } from 'react';
import { Alert } from '@mui/material';

export interface CanvasErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error) => void;
  /** When this value changes (by reference), a previously-tripped boundary resets. */
  resetKey?: unknown;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
  resetKey: unknown;
}

/**
 * Wraps the generated-UI canvas so a crash inside a dynamically rendered spec
 * (bad extension component, bad $computed expression, etc.) can't take down
 * the whole chat experience. Resets itself whenever `resetKey` (the current
 * spec) changes reference, so a fresh generation gets a clean render attempt.
 */
export class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  state: CanvasErrorBoundaryState = { hasError: false, resetKey: this.props.resetKey };

  static getDerivedStateFromProps(
    props: CanvasErrorBoundaryProps,
    state: CanvasErrorBoundaryState,
  ): Partial<CanvasErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) {
      return { hasError: false, resetKey: props.resetKey };
    }
    return null;
  }

  static getDerivedStateFromError(): Partial<CanvasErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <Alert severity="error">This generated UI crashed — ask for a fix or a new UI.</Alert>;
    }
    return this.props.children;
  }
}
