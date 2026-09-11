/** Versioned Mulberry32 stream. Never use Math.random to reconstruct a variant. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Random = ReturnType<typeof seededRandom>;
export const integer = (rng: Random, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
export const pick = <T,>(rng: Random, items: readonly T[]): T => items[integer(rng, 0, items.length - 1)];
export function shuffle<T>(items: readonly T[], rng: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = integer(rng, 0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function newSeed(): number {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
}
