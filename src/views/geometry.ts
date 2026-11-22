import { svg, type SVGTemplateResult } from "lit";

/*
 * Isometric house geometry (480×395 viewBox).
 * Two visible walls, each addressed by u (0…1 along the wall) and h (px downwards from the eave; 65 = ground):
 *   f – front/eave wall from (90,150) to (220,225), facing lower left
 *   r – gable wall from (220,225) to (320,167), facing lower right
 */

export type Pt = [number, number];
export type Wall = "f" | "r";

export const WALL: Record<Wall, { p: (u: number, h: number) => Pt; o: Pt }> = {
  r: { p: (u, h) => [220 + 100 * u, 225 - 58 * u + h], o: [0.866, 0.5] },
  f: { p: (u, h) => [90 + 130 * u, 150 + 75 * u + h], o: [-0.866, 0.5] },
};

export const pt = (a: Pt): string => `${a[0].toFixed(1)},${a[1].toFixed(1)}`;
export const pts = (list: Pt[]): string => list.map(pt).join(" ");

/** [top, front, side] fill colors of a cuboid. */
export type Palette = [string, string, string];

export const WHITE: Palette = ["var(--vce-box-top)", "var(--vce-box)", "var(--vce-box-side)"];
export const DARK: Palette = ["var(--vce-dev-dark-top)", "var(--vce-dev-dark)", "var(--vce-dev-dark-side)"];

export const plain = (list: Pt[], fill: string): SVGTemplateResult =>
  svg`<polygon points=${pts(list)} style="fill:${fill}"></polygon>`;

const solid = (list: Pt[], fill: string): SVGTemplateResult =>
  svg`<polygon class="solid" points=${pts(list)} style="fill:${fill}"></polygon>`;

export interface Cuboid {
  tpl: SVGTemplateResult;
  /** Point on the front face; s along the wall, t downwards (both 0…1). */
  face: (s: number, t: number) => Pt;
  quad: (s0: number, s1: number, t0: number, t1: number) => Pt[];
}

/** A box mounted on a wall: u0…u1 along the wall, h0…h1 downwards, depth d, optional gap to the wall. */
export function cuboid(
  wall: Wall,
  u0: number,
  u1: number,
  h0: number,
  h1: number,
  d: number,
  pal: Palette,
  gap = 0,
): Cuboid {
  const w = WALL[wall];
  const P = (u: number, h: number, k: number): Pt => {
    const b = w.p(u, h);
    return [b[0] + w.o[0] * k, b[1] + w.o[1] * k];
  };
  const A = P(u0, h0, gap), B = P(u1, h0, gap), C = P(u1, h1, gap), D = P(u0, h1, gap);
  const A2 = P(u0, h0, gap + d), B2 = P(u1, h0, gap + d), C2 = P(u1, h1, gap + d), D2 = P(u0, h1, gap + d);
  // The visible end face is the one facing the viewer: −u on the gable wall, +u on the front wall.
  const side = wall === "r" ? [A, A2, D2, D] : [B, B2, C2, C];
  const face = (s: number, t: number) => P(u0 + (u1 - u0) * s, h0 + (h1 - h0) * t, gap + d);
  const quad = (s0: number, s1: number, t0: number, t1: number) => [face(s0, t0), face(s1, t0), face(s1, t1), face(s0, t1)];
  return {
    tpl: svg`${solid([A, B, B2, A2], pal[0])}${solid(side as Pt[], pal[2])}${solid([A2, B2, C2, D2], pal[1])}`,
    face,
    quad,
  };
}

/** Horizontal lines across the front face of a cuboid (vents, grilles). */
export const slats = (c: Cuboid, s0: number, s1: number, ts: number[]): SVGTemplateResult[] =>
  ts.map((t) => svg`<polyline class="slat" points=${pts([c.face(s0, t), c.face(s1, t)])}></polyline>`);

/** Round fan on the front face of a cuboid. */
export function fan(center: Pt, rotation: number, active: boolean, color: string): SVGTemplateResult {
  const [x, y] = center.map((n) => n.toFixed(1));
  const stroke = active ? color : "var(--vce-box-line)";
  return svg`
    <ellipse cx=${x} cy=${y} rx="5.2" ry="7.2" transform="rotate(${rotation} ${x} ${y})"
      style="fill:var(--vce-dev-dark-side);stroke:${stroke};stroke-width:1.3"></ellipse>
    <circle cx=${x} cy=${y} r="1.4" style="fill:${stroke}"></circle>`;
}

/** Window flush with the wall: frame, glass, glazing bars and an optional sill. */
export function windowOn(wall: Wall, u0: number, u1: number, h0: number, h1: number, sill = true): SVGTemplateResult {
  const w = WALL[wall];
  const q = (a: number, b: number, c: number, d: number): Pt[] => [w.p(a, c), w.p(b, c), w.p(b, d), w.p(a, d)];
  const du = (u1 - u0) * 0.1, dh = (h1 - h0) * 0.1, um = (u0 + u1) / 2, hm = (h0 + h1) / 2;
  return svg`
    ${plain(q(u0, u1, h0, h1), "var(--vce-box-side)")}
    ${plain(q(u0 + du, u1 - du, h0 + dh, h1 - dh), "var(--vce-window)")}
    <polyline class="mullion" points=${pts([w.p(um, h0 + dh), w.p(um, h1 - dh)])}></polyline>
    <polyline class="mullion" points=${pts([w.p(u0 + du, hm), w.p(u1 - du, hm)])}></polyline>
    ${sill ? cuboid(wall, u0 - 0.01, u1 + 0.01, h1, h1 + 2, 3, ["var(--vce-sill)", "var(--vce-sill)", "var(--vce-box-side)"]).tpl : ""}`;
}

/** Front door and walkway leading from it into the garden. */
export const DOOR = { u0: 0.38, u1: 0.48 };
const PATH_LEN = 74;
export function pathPoint(u: number, t: number): Pt {
  const b = WALL.f.p(u, 65);
  return [b[0] + WALL.f.o[0] * PATH_LEN * t, b[1] + WALL.f.o[1] * PATH_LEN * t];
}
