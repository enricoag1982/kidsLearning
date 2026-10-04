import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChanged } from './use-changed.ts';

describe('useChanged', () => {
  it('calls back for the first value when it differs from the initial one, and once per new value', () => {
    const onChange = vi.fn();
    const { rerender } = renderHook<undefined, { value: string | null }>(
      ({ value }) => {
        useChanged(value, null, onChange);
      },
      { initialProps: { value: 'a' } },
    );
    expect(onChange.mock.calls).toEqual([['a']]);

    rerender({ value: 'a' });
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender({ value: 'b' });
    expect(onChange.mock.calls).toEqual([['a'], ['b']]);

    rerender({ value: null });
    expect(onChange.mock.calls).toEqual([['a'], ['b'], [null]]);
  });

  it('does not call back while the value stays the initial one', () => {
    const onChange = vi.fn();
    renderHook(() => {
      useChanged(null, null, onChange);
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
