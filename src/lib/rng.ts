/** Deterministic PRNG so procedurally generated SVG is stable between builds. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const r1 = (n: number) => Math.round(n * 10) / 10;

export const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/**
 * Recursive branching tree. Returns one path string per depth level so each
 * level can be stroked with its own width.
 */
export function branchTree(
  rand: () => number,
  x: number,
  y: number,
  len: number,
  depth: number,
  opts: { spread?: number; twist?: number; thorns?: boolean; shrink?: number } = {},
) {
  const { spread = 0.55, twist = 0.25, thorns = false, shrink = 0.72 } = opts;
  const levels: string[] = Array.from({ length: depth }, () => '');
  const thornPath: string[] = [];
  const grow = (x: number, y: number, len: number, ang: number, d: number) => {
    if (d >= depth) return;
    const a = ang + (rand() - 0.5) * twist;
    const mx = x + Math.cos(a) * len * 0.5 + (rand() - 0.5) * len * 0.25;
    const my = y + Math.sin(a) * len * 0.5;
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    levels[d] += `M${r1(x)} ${r1(y)}Q${r1(mx)} ${r1(my)} ${r1(x2)} ${r1(y2)}`;
    if (thorns && d > 0) {
      for (let k = 0; k < 2; k++) {
        const t = 0.3 + rand() * 0.5;
        const tx = x + (x2 - x) * t;
        const ty = y + (y2 - y) * t;
        const ta = a + (rand() > 0.5 ? 1 : -1) * (0.9 + rand() * 0.5);
        const tl = len * 0.18;
        thornPath.push(`M${r1(tx)} ${r1(ty)}L${r1(tx + Math.cos(ta) * tl)} ${r1(ty + Math.sin(ta) * tl)}`);
      }
    }
    const kids = rand() > 0.35 ? 2 : 3;
    for (let k = 0; k < kids; k++) {
      const off = (k - (kids - 1) / 2) * spread * 2 / Math.max(1, kids - 1) + (rand() - 0.5) * 0.3;
      grow(x2, y2, len * (shrink + (rand() - 0.5) * 0.15), a + off, d + 1);
    }
  };
  grow(x, y, len, -Math.PI / 2, 0);
  return { levels, thorns: thornPath.join('') };
}
