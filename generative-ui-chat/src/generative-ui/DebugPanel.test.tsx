import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebugPanel } from './DebugPanel';
import { createJotaiStore } from './state/jotaiStore';
import { transformFunctions } from './catalog/transforms';
import { extractBindings, resolveBinding, preview, searchPaths } from './debugUtils';

const spec = {
  root: 'stack-1',
  elements: {
    'stack-1': { type: 'Stack', props: { direction: 'column' }, children: ['tile-1', 'list-1'], visible: true },
    'tile-1': {
      type: 'StatTile',
      props: { label: 'Total', value: { $state: '/data/totalPnl' }, format: 'currency' },
      children: [],
      visible: true,
    },
    'list-1': {
      type: 'DataList',
      props: {
        data: { $computed: 'filterBy', args: { data: { $state: '/data/positions' }, field: 'pnl', op: 'gt', value: { $state: '/threshold' } } },
        primaryField: 'symbol',
      },
      children: [],
      visible: { $state: '/showList', eq: true },
    },
  },
};

const storeState = {
  threshold: 100,
  showList: true,
  data: { totalPnl: 1234.5, positions: [{ symbol: 'WIN', pnl: 500 }, { symbol: 'LOSE', pnl: -50 }] },
};

function renderPanel(overrides: Partial<Parameters<typeof DebugPanel>[0]> = {}) {
  const store = createJotaiStore(structuredClone(storeState));
  const props = {
    spec: spec as object,
    store,
    functions: transformFunctions,
    turns: [],
    onClose: vi.fn(),
    ...overrides,
  };
  render(<DebugPanel {...props} />);
  return props;
}

describe('debugUtils', () => {
  it('extracts $state, $computed, and visible bindings', () => {
    const rows = extractBindings(spec);
    const kinds = rows.map((r) => `${r.element}:${r.kind}`);
    expect(kinds).toContain('tile-1:$state');
    expect(kinds).toContain('list-1:$computed');
    expect(kinds).toContain('list-1:visible');
  });

  it('resolves live values against the store, including $computed with $state args', () => {
    const store = createJotaiStore(structuredClone(storeState));
    const rows = extractBindings(spec);
    const stateRow = rows.find((r) => r.element === 'tile-1')!;
    expect(resolveBinding(stateRow, store, transformFunctions)).toBe(1234.5);
    const computedRow = rows.find((r) => r.kind === '$computed')!;
    expect(resolveBinding(computedRow, store, transformFunctions)).toEqual([{ symbol: 'WIN', pnl: 500 }]);
  });

  it('preview truncates and annotates arrays', () => {
    expect(preview('hello')).toBe('"hello"');
    expect(preview([1, 2, 3])).toContain('[3]');
    expect(preview('x'.repeat(200)).length).toBeLessThan(100);
  });

  it('searchPaths finds leaf paths by substring', () => {
    const matches = searchPaths(storeState, 'threshold');
    expect(matches).toEqual([{ path: '/threshold', value: 100 }]);
    expect(searchPaths(storeState, 'pnl').map((m) => m.path)).toContain('/data/positions/0/pnl');
  });
});

describe('DebugPanel', () => {
  it('shows the element tree with component types by default', () => {
    renderPanel();
    expect(screen.getByText('Stack')).toBeInTheDocument();
    expect(screen.getByText('StatTile')).toBeInTheDocument();
    expect(screen.getByText('#tile-1')).toBeInTheDocument();
  });

  it('shows live binding values on the Bindings tab', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('tab', { name: /Bindings/ }));
    expect(screen.getByText(/\/data\/totalPnl/)).toBeInTheDocument();
    expect(screen.getByText(/= 1234\.5/)).toBeInTheDocument();
  });

  it('filters state paths via the search box', async () => {
    renderPanel();
    await userEvent.click(screen.getByRole('tab', { name: 'State' }));
    await userEvent.type(screen.getByPlaceholderText(/Filter paths/), 'threshold');
    expect(screen.getByText('/threshold')).toBeInTheDocument();
  });

  it('lists generation turns with outcome and duration', async () => {
    renderPanel({
      turns: [
        { at: Date.now(), prompt: 'build a dashboard', ms: 42000, outcome: 'spec', elements: 20 },
        { at: Date.now(), prompt: 'impossible thing', ms: 9000, outcome: 'error', error: 'failed validation' },
      ],
    });
    await userEvent.click(screen.getByRole('tab', { name: /Turns/ }));
    expect(screen.getByText('build a dashboard')).toBeInTheDocument();
    expect(screen.getByText(/42\.0s/)).toBeInTheDocument();
    expect(screen.getByText('failed validation')).toBeInTheDocument();
  });

  it('Store tab shows the engine and logs mutations with old → new values', async () => {
    const { store } = renderPanel();
    await userEvent.click(screen.getByRole('tab', { name: 'Store' }));
    expect(screen.getByText('jotai')).toBeInTheDocument();
    expect(screen.getByText(/No mutations yet/)).toBeInTheDocument();

    act(() => store.set('/threshold', 250));
    expect(screen.getByText('/threshold')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  it('Store tab mutes /data churn by default but keeps it in the log', async () => {
    const { store } = renderPanel();
    await userEvent.click(screen.getByRole('tab', { name: 'Store' }));
    act(() => store.set('/data', { totalPnl: 9999, positions: [] }));
    expect(screen.getByText(/Only \/data ticks so far/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: /mute \/data/i }));
    expect(screen.getByText('/data/totalPnl')).toBeInTheDocument();
  });

  it('calls onClose from the close button', async () => {
    const { onClose } = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'close inspector' }));
    expect(onClose).toHaveBeenCalled();
  });
});
