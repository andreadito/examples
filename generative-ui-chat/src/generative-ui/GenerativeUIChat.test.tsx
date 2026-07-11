import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenerativeUIChat } from './GenerativeUIChat';
import * as llm from './llm/generate';

const goodSpec = {
  root: 's',
  elements: { s: { type: 'StatTile', props: { label: 'Total P&L', value: 42, format: 'number', delta: null, color: null, sx: null }, children: [] } },
};

describe('GenerativeUIChat', () => {
  it('renders empty canvas hint and chat composer initially', () => {
    render(<GenerativeUIChat data={{ positions: [] }} />);
    expect(screen.getByText(/build something/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/build me something/i)).toBeInTheDocument();
  });

  it('renders generated spec on the canvas and fires onSpecChange', async () => {
    vi.spyOn(llm, 'generate').mockResolvedValue({ text: 'done', spec: goodSpec });
    const onSpecChange = vi.fn();
    render(<GenerativeUIChat data={{ positions: [] }} onSpecChange={onSpecChange} />);
    const input = screen.getByPlaceholderText(/build me something/i);
    await userEvent.type(input, 'make a stat{enter}');
    await waitFor(() => expect(screen.getByText('Total P&L')).toBeInTheDocument());
    expect(onSpecChange).toHaveBeenCalledWith(goodSpec);
  });

  it('fires onError when generation fails', async () => {
    vi.spyOn(llm, 'generate').mockRejectedValue(new Error('boom'));
    const onError = vi.fn();
    render(<GenerativeUIChat data={{}} onError={onError} />);
    await userEvent.type(screen.getByPlaceholderText(/build me something/i), 'x{enter}');
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });
});
