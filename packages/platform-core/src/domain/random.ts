/** Randomness in [0, 1); seeded in tests. */
export interface Random {
  next(): number;
}

/** Deterministic mulberry32 PRNG: same seed, same sequence on any platform; for reproducible bots and tests, not security. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random.next() * (i + 1));
    const a = shuffled[i];
    const b = shuffled[j];
    if (a !== undefined && b !== undefined) {
      shuffled[i] = b;
      shuffled[j] = a;
    }
  }
  return shuffled;
}

/** Integer in [min, max] (both inclusive); throws when min > max or either is not an integer. */
export function randomInt(random: Random, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error(`randomInt: min and max must be integers (got ${String(min)}, ${String(max)})`);
  }
  if (min > max) {
    throw new Error(`randomInt: min ${String(min)} is greater than max ${String(max)}`);
  }
  return min + Math.floor(random.next() * (max - min + 1));
}

/** One item; throws on an empty list. */
export function pick<T>(random: Random, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('pick: the list is empty');
  }
  // In range by construction; `T` itself may include `undefined`, so the index access is cast, not checked.
  return items[randomInt(random, 0, items.length - 1)] as T;
}
