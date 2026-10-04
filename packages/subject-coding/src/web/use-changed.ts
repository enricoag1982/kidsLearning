import { useState } from 'react';

/** Calls `onChange(value)` during the render in which `value` first differs from the last one seen (`initial` for the first render):
 * React's own way to adjust state to a changed input without an effect. `onChange` may set state of this component (start a
 * replay, fill the strip) and nothing else. */
export function useChanged<T>(value: T, initial: T, onChange: (value: T) => void): void {
  const [seen, setSeen] = useState(initial);
  if (!Object.is(seen, value)) {
    setSeen(value);
    onChange(value);
  }
}
