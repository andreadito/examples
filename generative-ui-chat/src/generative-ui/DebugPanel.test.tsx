import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebugPanel } from './DebugPanel';
import { createJotaiStore } from './state/jotaiStore';

describe('DebugPanel', () => {
  it('shows the spec JSON on the Spec tab', () => {
    const store = createJotaiStore({ data: { a: 1 } });
    render(<DebugPanel spec={{ root: 'x', elements: {} }} store={store} onClose={vi.fn()} />);
    expect(screen.getByText(/"root": "x"/)).toBeInTheDocument();
  });

  it('shows a hint when nothing has been generated yet', () => {
    const store = createJotaiStore({});
    render(<DebugPanel spec={null} store={store} onClose={vi.fn()} />);
    expect(screen.getByText(/Nothing generated yet/)).toBeInTheDocument();
  });

  it('shows the live store snapshot on the State tab', async () => {
    const store = createJotaiStore({ data: { positions: [{ symbol: 'AAPL' }] } });
    render(<DebugPanel spec={null} store={store} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'State' }));
    expect(screen.getByText(/"symbol": "AAPL"/)).toBeInTheDocument();
  });

  it('calls onClose from the close button', async () => {
    const store = createJotaiStore({});
    const onClose = vi.fn();
    render(<DebugPanel spec={null} store={store} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'close inspector' }));
    expect(onClose).toHaveBeenCalled();
  });
});
