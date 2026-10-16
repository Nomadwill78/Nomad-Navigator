import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoneyInput } from '../components/MoneyInput';

/** Mirrors how the grant screen uses it: the saved value is whatever was last committed. */
const Harness: React.FC<{ onSave: (v: number | undefined) => void; start?: number }> = ({ onSave, start = 0 }) => {
  const [saved, setSaved] = useState<number | undefined>(start);
  return <MoneyInput value={saved} ariaLabel="Spent" onCommit={(v) => { setSaved(v); onSave(v); }} />;
};
const type = (el: HTMLElement, text: string) => {
  let acc = '';
  for (const ch of text) { acc += ch; fireEvent.change(el, { target: { value: acc } }); }
};

describe('issue 1: the spent box keeps cents', () => {
  it('typing 1234.5 saves 1234.5, not 1234', () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    const input = screen.getByLabelText('Spent');
    fireEvent.focus(input);
    type(input, '1234.5');
    expect(onSave).toHaveBeenLastCalledWith(1234.5);
    expect((input as HTMLInputElement).value).toBe('1234.5');
  });
  it('typing 47000.25 saves 47000.25, never 470005', () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    const input = screen.getByLabelText('Spent');
    fireEvent.focus(input);
    type(input, '47000.25');
    expect(onSave).toHaveBeenLastCalledWith(47000.25);
    expect(onSave.mock.calls.map((c) => c[0])).not.toContain(470005);
    expect((input as HTMLInputElement).value).toBe('47000.25');
  });
  it('whole dollars still work', () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    const input = screen.getByLabelText('Spent');
    fireEvent.focus(input);
    type(input, '98500');
    expect(onSave).toHaveBeenLastCalledWith(98500);
  });
  it('refuses a third decimal, text and a $99 billion amount, and saves none of them', () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    const input = screen.getByLabelText('Spent');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1.234' } });
    expect(screen.getByRole('alert').textContent).toMatch(/2 decimal/);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.change(input, { target: { value: '99000000000' } });
    expect(screen.getByRole('alert').textContent).toMatch(/not accepted/);
    expect(onSave).not.toHaveBeenCalled();
  });
  it('an emptied box asks for an amount instead of saving nothing', () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} start={5} />);
    const input = screen.getByLabelText('Spent');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByRole('alert').textContent).toMatch(/Enter an amount/);
    expect(onSave).not.toHaveBeenCalled();
  });
});
