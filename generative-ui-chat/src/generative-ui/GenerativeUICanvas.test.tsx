import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenerativeUICanvas } from './GenerativeUICanvas';

const handAuthoredSpec = {
  root: 'row',
  elements: {
    row: {
      type: 'Stack',
      props: { direction: 'row', gap: 2, wrap: null, sx: null },
      children: ['tile', 'btn'],
      visible: true,
    },
    tile: {
      type: 'StatTile',
      props: { label: 'Total P&L', value: { $state: '/data/totalPnl' }, format: 'number', delta: null, color: null, sx: null },
      children: [],
      visible: true,
    },
    btn: {
      type: 'Button',
      props: { label: 'Flatten', variant: null, color: null },
      on: { press: { action: 'emit', params: { name: 'flatten', payload: null } } },
      children: [],
      visible: true,
    },
  },
};

describe('GenerativeUICanvas', () => {
  it('renders a hand-authored spec bound to live data, no LLM involved', () => {
    render(<GenerativeUICanvas spec={handAuthoredSpec} data={{ totalPnl: 1234 }} />);
    expect(screen.getByText('Total P&L')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('normalizes specs missing visible/children like the chat loop does', () => {
    const bare = { root: 't', elements: { t: { type: 'StatTile', props: { label: 'Bare', value: 1 } } } };
    render(<GenerativeUICanvas spec={bare} data={{}} />);
    expect(screen.getByText('Bare')).toBeInTheDocument();
  });

  it('routes emit actions from the spec to onEvent', async () => {
    const onEvent = vi.fn();
    render(<GenerativeUICanvas spec={handAuthoredSpec} data={{ totalPnl: 0 }} onEvent={onEvent} />);
    await userEvent.click(screen.getByRole('button', { name: 'Flatten' }));
    expect(onEvent).toHaveBeenCalledWith('flatten', undefined);
  });

  it('fires onError and renders nothing for an invalid spec', () => {
    const onError = vi.fn();
    const bad = { root: 'x', elements: { x: { type: 'NoSuchComponent', props: {}, children: [] } } };
    render(<GenerativeUICanvas spec={bad} data={{}} onError={onError} />);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('spec failed validation') }));
    expect(screen.queryByText('NoSuchComponent')).not.toBeInTheDocument();
  });

  it('shows the empty hint when spec is null', () => {
    render(<GenerativeUICanvas spec={null} data={{}} emptyHint="Nothing here yet" />);
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });
});
