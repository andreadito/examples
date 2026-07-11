import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Renderer, StateProvider, VisibilityProvider, ActionProvider } from '@json-render/react';
import { buildRuntime } from './buildRuntime';

// NOTE (library finding, Task 6): `ElementRenderer` inside `@json-render/react`'s
// `Renderer` unconditionally calls `useActions()` to resolve `on.press`-style
// bindings, even for elements with no `on` at all. That hook throws
// "useActions must be used within an ActionProvider" if no `ActionProvider` is
// mounted above the `Renderer`. The brief's test sketch only wraps
// `StateProvider` + `VisibilityProvider`, which is not sufficient — an
// `ActionProvider` (with an empty handlers map is fine; this spec fires no
// actions) must also be present.
//
// NOTE (library finding, Task 6): Task 5 established that `catalog.validate()`
// requires every element to carry an explicit `visible` key (any value,
// including `null`, satisfies the nonoptional `z.any()` field). However, at
// *render* time `@json-render/react`'s `ElementRenderer` only short-circuits
// to "visible" when `element.visible === undefined`; any other value
// (including `null`) is passed to `@json-render/core`'s `evaluateVisibility`,
// which does NOT special-case `null` and crashes with
// `TypeError: Cannot use 'in' operator to search for '$index' in null`
// (it assumes a condition object). So elements must use `visible: undefined`
// (key present, value `undefined` — still satisfies the nonoptional-any
// validate check per Task 5 finding #2) rather than `visible: null` when they
// are meant to always render.
const spec = {
  root: 'stack-1',
  elements: {
    'stack-1': { type: 'Stack', props: { direction: 'column', gap: 2, wrap: null, sx: null }, children: ['stat-1', 'text-1'], visible: undefined },
    'stat-1': { type: 'StatTile', props: { label: 'Total P&L', value: 1234.5, format: 'currency', delta: 2.1, color: 'success', sx: null }, children: [], visible: undefined },
    'text-1': { type: 'Typography', props: { text: { $state: '/data/note' }, variant: 'body2', color: null, sx: null }, children: [], visible: undefined },
  },
};

// `normalizeSpec` fills in an absent/null `visible` key with the literal
// `true` (not `undefined` — see normalizeSpec.ts), so `visible: true` is the
// other value elements commonly carry in a validated, generation-loop-produced
// spec. This pins that `@json-render/react`'s `ElementRenderer` renders such
// elements normally (unlike `visible: null`, which crashes — see the library
// finding above): `true` is not `undefined`, so it does NOT hit the
// "visible" short-circuit, but `evaluateVisibility` handles a boolean `true`
// condition without the `'$index' in null` crash that a bare `null` triggers.
const visibleTrueSpec = {
  root: 'stack-1',
  elements: {
    'stack-1': { type: 'Stack', props: { direction: 'column', gap: 2, wrap: null, sx: null }, children: ['text-1'], visible: true },
    'text-1': { type: 'Typography', props: { text: 'always visible', variant: 'body2', color: null, sx: null }, children: [], visible: true },
  },
};

describe('registry smoke test', () => {
  it('renders a spec whose elements use visible: true through the real Renderer', () => {
    const { catalog, registry } = buildRuntime({ emit: vi.fn() });
    expect(catalog.validate(visibleTrueSpec).success).toBe(true);
    render(
      <StateProvider initialState={{ data: {} }}>
        <VisibilityProvider>
          <ActionProvider handlers={{}}>
            <Renderer spec={visibleTrueSpec as never} registry={registry} />
          </ActionProvider>
        </VisibilityProvider>
      </StateProvider>,
    );
    expect(screen.getByText('always visible')).toBeInTheDocument();
  });

  it('renders a validated spec with live state', () => {
    const { catalog, registry } = buildRuntime({ emit: vi.fn() });
    expect(catalog.validate(spec).success).toBe(true);
    render(
      <StateProvider initialState={{ data: { note: 'from state' } }}>
        <VisibilityProvider>
          <ActionProvider handlers={{}}>
            <Renderer spec={spec as never} registry={registry} />
          </ActionProvider>
        </VisibilityProvider>
      </StateProvider>,
    );
    expect(screen.getByText('Total P&L')).toBeInTheDocument();
    expect(screen.getByText('$1,234.50')).toBeInTheDocument();
    expect(screen.getByText('from state')).toBeInTheDocument();
  });

  it('registry has an implementation for every catalog component', () => {
    const { registry } = buildRuntime({ emit: vi.fn() });
    for (const type of ['Stack', 'Box', 'Card', 'Divider', 'Typography', 'Chip', 'Alert', 'LinearProgress', 'StatTile', 'DataList', 'Tabs', 'Select', 'Slider', 'ToggleButtonGroup', 'TextField', 'Switch', 'Button', 'LineChart', 'BarChart', 'PieChart', 'Sparkline', 'DataGrid']) {
      expect(registry[type], `missing registry impl for ${type}`).toBeTruthy();
    }
  });
});
