export type Rng = () => number;

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createRng(seed: string): Rng {
  let a = hashSeed(seed);
  return function mulberry32() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function trialSeed(sessionSeed: string, trialIndex: number): string {
  return `${sessionSeed}-t${trialIndex}`;
}

export function randRange(rng: Rng, [min, max]: [number, number]): number {
  return min + rng() * (max - min);
}

export function randInt(rng: Rng, max: number): number {
  return Math.floor(rng() * max);
}

export function randSign(rng: Rng): 1 | -1 {
  return rng() < 0.5 ? 1 : -1;
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickRandom<T>(items: T[], rng: Rng): T {
  return items[randInt(rng, items.length)];
}
