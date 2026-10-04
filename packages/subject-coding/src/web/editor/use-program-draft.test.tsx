import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { CODING_SAMPLES } from '../../testing/samples.ts';
import { useProgramDraft } from './use-program-draft.ts';

const def = { ...CODING_SAMPLES.program, cap: 3, prefilled: [{ kind: 'right' as const }] };

describe('useProgramDraft', () => {
  it('starts from the prefilled strip and edits it through one function per operation', () => {
    const { result } = renderHook(() => useProgramDraft(def));
    expect(result.current.slots).toEqual([{ kind: 'right' }, null, null]);

    act(() => {
      result.current.add('repeat');
    });
    act(() => {
      result.current.add('down');
    });
    act(() => {
      result.current.cycleTimes(1);
    });
    expect(result.current.openRepeat).toBe(1);
    expect(result.current.program()).toEqual([
      { kind: 'right' },
      { kind: 'repeat', times: 4, body: [{ kind: 'down' }] },
    ]);

    act(() => {
      result.current.toggleRepeat(1);
    });
    expect(result.current.openRepeat).toBeNull();
    act(() => {
      result.current.remove([1, 0]);
    });
    act(() => {
      result.current.remove([0]);
    });
    expect(result.current.slots[0]).toBeNull();

    act(() => {
      result.current.reset();
    });
    expect(result.current.slots).toEqual([{ kind: 'right' }, null, null]);

    act(() => {
      result.current.load([{ kind: 'up' }]);
    });
    expect(result.current.program()).toEqual([{ kind: 'up' }]);
  });
});
