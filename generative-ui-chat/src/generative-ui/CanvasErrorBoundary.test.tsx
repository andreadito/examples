import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';

describe('CanvasErrorBoundary', () => {
  let consoleErrorMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
  });

  it('renders children normally when nothing throws', () => {
    render(
      <CanvasErrorBoundary>
        <div>Test content</div>
      </CanvasErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('shows fallback Alert and calls onError when a child throws during render', () => {
    function Bomb(): never {
      throw new Error('boom');
    }

    const onError = vi.fn();

    render(
      <CanvasErrorBoundary onError={onError}>
        <Bomb />
      </CanvasErrorBoundary>
    );

    // Assert that the fallback Alert is shown with the correct text
    expect(screen.getByText('This generated UI crashed — ask for a fix or a new UI.')).toBeInTheDocument();

    // Assert that onError was called with the thrown error
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
  });

  it('resets when resetKey changes by reference and children no longer throw', () => {
    let shouldThrow = true;

    function ConditionalBomb() {
      if (shouldThrow) {
        throw new Error('boom');
      }
      return <div>Success</div>;
    }

    const resetKey1 = { id: 1 };

    const { rerender } = render(
      <CanvasErrorBoundary resetKey={resetKey1}>
        <ConditionalBomb />
      </CanvasErrorBoundary>
    );

    // Should show fallback Alert after the throw
    expect(screen.getByText('This generated UI crashed — ask for a fix or a new UI.')).toBeInTheDocument();

    // Now stop throwing and provide a new resetKey reference
    shouldThrow = false;
    const resetKey2 = { id: 2 }; // Different reference

    rerender(
      <CanvasErrorBoundary resetKey={resetKey2}>
        <ConditionalBomb />
      </CanvasErrorBoundary>
    );

    // Should now render the children instead of the fallback
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.queryByText('This generated UI crashed — ask for a fix or a new UI.')).not.toBeInTheDocument();
  });
});
