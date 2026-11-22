import { nothing, svg, type SVGTemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { styleMap } from "lit/directives/style-map.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { flowDuration } from "../format";
import { clampLabelX, clickable, COLOR, labelScale, type ViewContext } from "./context";

/*
 * Second house motif: modern end-of-terrace house with flat roof, dark front volume,
 * single-storey annex, neighbour house on the left, two garages with PV on the right
 * and a back garden (with an optional jacuzzi to the right of the garages).
 *
 * World coordinates in metres: x to the right, y towards the viewer, z up.
 * The static drawing is built as an SVG string; flows and labels are Lit templates
 * so that they stay clickable.
 */

type V3 = [number, number, number];
type P2 = [number, number];

const S = 10;
const P = ([x, y, z]: V3): P2 => [214 + (x - y) * 0.866 * S, 150 + (x + y) * 0.5 * S - z * S];
const f1 = (n: number) => n.toFixed(1);
const pts = (list: V3[]) => list.map((p) => P(p).map(f1).join(",")).join(" ");
const poly = (list: V3[], fill: string | null, cls = "t-edge", extra = "") =>
  `<polygon class="${cls}" points="${pts(list)}"${fill ? ` style="fill:${fill}"` : ""} ${extra}/>`;

type Pal = [string, string, string];
const pal = (name: string): Pal => [`var(--vce-t-${name}-t)`, `var(--vce-t-${name})`, `var(--vce-t-${name}-s)`];
const WALL = pal("wall"), DARKV = pal("dark"), NB = pal("nb"), GARAGE = pal("garage"), DECK = pal("deck");
const BOX: Pal = ["var(--vce-box-top)", "var(--vce-box)", "var(--vce-box-side)"];
const NB_DARK: Pal = ["var(--vce-t-dark-t)", "var(--vce-t-nb-dark)", "var(--vce-t-dark-s)"];
const WB: Pal = ["var(--vce-dev-dark-top)", "var(--vce-dev-dark)", "var(--vce-dev-dark-side)"];

/** Cuboid with the three visible faces: top, front (y + d) and side (x + w). */
function box(x: number, y: number, z: number, w: number, d: number, h: number, c: Pal, noSide = false): string {
  let s = "";
  if (!noSide) s += poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], c[2]);
  s += poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c[1]);
  s += poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c[0]);
  return s;
}
const onFront = (y: number, x0: number, x1: number, z0: number, z1: number, fill: string | null, cls = "t-edge") =>
  poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], fill, cls);
const onSide = (x: number, y0: number, y1: number, z0: number, z1: number, fill: string | null, cls = "t-edge") =>
  poly([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]], fill, cls);

/** Window on the front: frame, glass and (for our house) a glow layer for the indoor lighting. */
function windowFront(y: number, x0: number, x1: number, z0: number, z1: number, ours = true): string {
  const fx = (x1 - x0) * 0.08, fz = (z1 - z0) * 0.08;
  const glass: V3[] = [[x0 + fx, y, z0 + fz], [x1 - fx, y, z0 + fz], [x1 - fx, y, z1 - fz], [x0 + fx, y, z1 - fz]];
  return onFront(y, x0, x1, z0, z1, "var(--vce-t-frame)") + poly(glass, "var(--vce-window)") + (ours ? poly(glass, null, "glass-lit") : "");
}
function windowSide(x: number, y0: number, y1: number, z0: number, z1: number): string {
  const fy = (y1 - y0) * 0.08, fz = (z1 - z0) * 0.08;
  const glass: V3[] = [[x, y0 + fy, z0 + fz], [x, y1 - fy, z0 + fz], [x, y1 - fy, z1 - fz], [x, y0 + fy, z1 - fz]];
  return onSide(x, y0, y1, z0, z1, "var(--vce-t-frame)") + poly(glass, "var(--vce-window)") + poly(glass, null, "glass-lit");
}

function hedge(x0: number, y0: number, x1: number, y1: number, r: number): string {
  let out = "";
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / (r * 1.1)));
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = P([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r * 0.8]);
    out += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(r * S * 0.62)}" style="fill:var(--vce-t-hedge-dark)"/>`
      + `<circle cx="${f1(p[0] - r * S * 0.12)}" cy="${f1(p[1] - r * S * 0.14)}" r="${f1(r * S * 0.48)}" class="hedge"/>`;
  }
  return out;
}

/** PV rows on a flat roof, tilted towards the viewer. */
function pvRows(x0: number, x1: number, y0: number, y1: number, z: number, rows: number): string {
  let out = "";
  const depth = (y1 - y0) / rows;
  const cols = Math.round((x1 - x0) / 1.05);
  for (let r = 0; r < rows; r++) {
    const yb = y0 + depth * (r + 1) - 0.3, yt = yb - depth * 0.7;
    for (let c = 0; c < cols; c++) {
      const xa = x0 + ((x1 - x0) * c) / cols + 0.03, xb = x0 + ((x1 - x0) * (c + 1)) / cols - 0.03;
      out += poly([[xa, yb, z + 0.15], [xb, yb, z + 0.15], [xb, yt, z + 0.8], [xa, yt, z + 0.8]], null, "panel");
    }
  }
  return out;
}

/** Bollard with light pool; the pool and the head light up via the group's "on" class. */
function bollard(x: number, y: number, uid: string): string {
  const b = P([x, y, 0]), t = P([x, y, 0.9]);
  return `<ellipse class="glow" cx="${f1(b[0])}" cy="${f1(b[1])}" rx="${f1(1.1 * S)}" ry="${f1(0.55 * S)}" fill="url(#${uid}-pool)"/>`
    + `<line x1="${f1(b[0])}" y1="${f1(b[1])}" x2="${f1(t[0])}" y2="${f1(t[1])}" style="stroke:var(--vce-dev-dark);stroke-width:${f1(0.12 * S)}"/>`
    + `<rect class="lamp-head" x="${f1(t[0] - 0.14 * S)}" y="${f1(t[1] - 0.25 * S)}" width="${f1(0.28 * S)}" height="${f1(0.25 * S)}" rx="1"/>`;
}

// ---- layout constants
const H = 6.2, X1 = 8, Y1 = 9;
const GX0 = 11, GY0 = -2.5, GY1 = 3.4, GW = 3.1, GARAGES = 2;
const X_END = GX0 + GW * GARAGES + 5;
const INV = { y0: 4.2, y1: 5.0, z0: 1.3, z1: 2.3 };
const BAT = { y0: 6.6, y1: 7.8, z0: 0.3, z1: 2.3 };
const FRONT_LAMPS: [number, number][] = [[4.0, 13.2], [5.8, 14.1], [GX0 - 0.5, 14.2]];
const GARDEN_LAMPS: [number, number][] = [[8.9, -1.3], [9.6, -5.2], [14.5, -6.1], [21.4, -1.6]];
const JAC = { x: 18.4, y: -4.8, w: 2.4 };

/** Everything behind the house: ground, back garden, garages, neighbour. Static. */
const BACKDROP = (() => {
  let g = "";
  g += poly([[-9, -7.4, 0], [X_END, -7.4, 0], [X_END, 17, 0], [-9, 17, 0]], "var(--vce-t-ground)", "");
  g += poly([[-9, -7.2, 0], [X_END - 0.2, -7.2, 0], [X_END - 0.2, -0.2, 0], [-9, -0.2, 0]], "var(--vce-lawn)", "");
  g += hedge(2, -6.8, X_END - 0.6, -6.8, 0.8);
  const t = P([10.1, -2.9, 0]), c = P([10.1, -2.9, 3.0]);
  g += `<line x1="${f1(t[0])}" y1="${f1(t[1])}" x2="${f1(c[0])}" y2="${f1(c[1])}" style="stroke:var(--vce-door);stroke-width:${f1(0.25 * S)}"/>`
    + `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(1.25 * S)}" style="fill:var(--vce-t-hedge-dark)"/>`
    + `<circle cx="${f1(c[0] - 0.25 * S)}" cy="${f1(c[1] - 0.3 * S)}" r="${f1(0.9 * S)}" class="hedge"/>`;
  g += poly([[-9, 14.6, 0], [X_END, 14.6, 0], [X_END, 17, 0], [-9, 17, 0]], "var(--vce-t-street)", "");
  g += poly([[GX0, GY1, 0], [GX0 + GW * GARAGES, GY1, 0], [GX0 + GW * GARAGES, 14.6, 0], [GX0, 14.6, 0]], "var(--vce-t-brick)", "");
  g += poly([[4.2, 12, 0], [5.6, 12, 0], [5.6, 14.6, 0], [4.2, 14.6, 0]], "var(--vce-t-street)", "");
  return g;
})();

const GARAGE_ROW = (() => {
  let g = box(GX0, GY0, 0, GW * GARAGES, GY1 - GY0, 2.8, GARAGE);
  for (let i = 0; i < GARAGES; i++) {
    const x0 = GX0 + GW * i;
    g += onFront(GY1, x0 + 0.35, x0 + GW - 0.35, 0, 2.2, "var(--vce-t-gdoor)");
    for (let k = 1; k < 5; k++) {
      g += `<polyline points="${pts([[x0 + 0.35, GY1, k * 0.44], [x0 + GW - 0.35, GY1, k * 0.44]])}" fill="none" stroke="rgba(0,0,0,.18)" stroke-width=".7"/>`;
    }
  }
  g += box(GX0, GY0, 2.8, GW * GARAGES, 0.25, 0.2, GARAGE) + box(GX0, GY1 - 0.25, 2.8, GW * GARAGES, 0.25, 0.2, GARAGE);
  g += pvRows(GX0 + 0.3, GX0 + GW * GARAGES - 0.3, GY0 + 0.3, GY1 - 0.3, 2.8, 2);
  return g;
})();

const NEIGHBOUR = (() => {
  const x0 = -X1;
  let g = box(x0, 0, 0, X1, Y1, H, NB, true);
  g += box(x0, 0, H, X1, 0.3, 0.35, NB) + box(x0, Y1 - 0.3, H, X1, 0.3, 0.35, NB);
  g += box(x0, Y1, 0, 4, 1, H + 0.2, NB_DARK, true);
  g += windowFront(Y1 + 1, x0 + 0.7, x0 + 3.1, 3.4, 5.6, false) + windowFront(Y1 + 1, x0 + 0.7, x0 + 3.1, 0.5, 2.6, false);
  g += windowFront(Y1, x0 + 5, x0 + 7, 3.6, 5.2, false);
  g += box(x0 + 4, Y1, 0, X1 - 4.2, 3, 3, NB) + box(x0 + 4, Y1, 3, X1 - 4.2, 3, 0.25, NB);
  g += onFront(Y1 + 3, x0 + 4.5, x0 + 5.5, 0, 2.2, "var(--vce-t-nb-s)") + windowFront(Y1 + 3, x0 + 6.1, x0 + 7.4, 1.0, 2.2, false);
  g += poly([[x0 + 4.2, 12, 0], [x0 + 5.6, 12, 0], [x0 + 5.6, 14.6, 0], [x0 + 4.2, 14.6, 0]], "var(--vce-t-street)", "");
  return g;
})();

const HOUSE = (() => {
  let g = box(0, 0, 0, X1, Y1, H, WALL);
  g += box(0, 0, H, X1, 0.3, 0.35, WALL) + box(0, Y1 - 0.3, H, X1, 0.3, 0.35, WALL) + box(X1 - 0.3, 0, H, 0.3, Y1, 0.35, WALL);
  g += pvRows(0.6, X1 - 0.7, 0.6, Y1 - 0.5, H, 3);
  g += windowSide(X1, 1.2, 2.6, 3.6, 5.2);
  g += box(0, Y1, 0, 4, 1, H + 0.2, DARKV);
  g += windowFront(Y1 + 1, 0.7, 3.1, 3.4, 5.6) + windowFront(Y1 + 1, 0.7, 3.1, 0.5, 2.6);
  return g;
})();

const ANNEX = (() => {
  let g = box(4, Y1, 0, 4.4, 3, 3, WALL) + box(4, Y1, 3, 4.4, 3, 0.25, WALL);
  const door: V3[] = [[4.65, Y1 + 3, 0.9], [5.35, Y1 + 3, 0.9], [5.35, Y1 + 3, 2.0], [4.65, Y1 + 3, 2.0]];
  g += onFront(Y1 + 3, 4.5, 5.5, 0, 2.2, "var(--vce-t-dark-s)") + poly(door, "var(--vce-window)") + poly(door, null, "glass-lit");
  g += windowFront(Y1 + 3, 6.4, 7.8, 1.0, 2.2);
  g += hedge(-7.6, 13.6, -4.3, 13.6, 0.9) + hedge(-2.2, 13.6, 3.6, 13.6, 0.9);
  return g;
})();

const path = (list: V3[]) => "M" + list.map((p) => P(p).map(f1).join(",")).join(" L");
const PATHS = {
  pv: path([[X1 - 0.4, 4.6, H + 0.3], [X1, 4.6, H - 0.2], [X1, 4.6, 2.3]]),
  battery: path([[X1, 5.0, 1.8], [X1, 6.6, 1.8]]),
  home: path([[X1, 4.8, 2.3], [X1, 4.8, 2.7], [X1, 9, 2.7], [5.6, 12, 1.0]]),
  grid: path([[X1, 4.6, 1.3], [X1, 4.6, 0], [X1 + 1.2, 4.6, 0], [X1 + 1.2, 15.2, 0], [GX0 + GW * GARAGES + 1.4, 15.2, 0]]),
  wallbox: path([[X1, 4.3, 1.3], [X1, 4.3, 0], [X1 + 0.3, 4.3, 0], [X1 + 0.3, 3.6, 0], [GX0 + 0.25, 3.6, 0], [GX0 + 0.25, GY1 + 0.2, 0.9]]),
  airConditioner: path([[X1, 4.2, 1.6], [X1, 3.6, 1.6]]),
  heatPump: path([[X1, 5.0, 1.3], [X1, 5.0, 0], [X1 + 0.6, 5.0, 0], [X1 + 0.6, 12.9, 0], [8.1, 12.9, 0.3]]),
};

export function renderTerraced(ctx: ViewContext, uid: string): SVGTemplateResult {
  const { flows: f, t, config } = ctx;
  const e = config.entities;
  const hasBattery = !!e.battery || !!e.battery_soc;
  const find = (kind: string) => ctx.devices.find((d) => d.kind === kind);
  const wallbox = find("wallbox"), heatPump = find("heat_pump"), ac = find("air_conditioner"), jacuzzi = find("jacuzzi");
  const batteryPower = f.charge || f.discharge;
  const exporting = f.gridExport > f.gridImport;
  const indoor = ctx.indoorLighting, front = ctx.lighting, garden = ctx.gardenLighting;
  const k = labelScale(ctx);

  // ---- dynamic drawing parts
  let dyn = "";
  dyn += box(X1, INV.y0, INV.z0, 0.25, INV.y1 - INV.y0, INV.z1 - INV.z0, BOX);
  if (hasBattery) {
    dyn += box(X1, BAT.y0, BAT.z0, 0.45, BAT.y1 - BAT.y0, BAT.z1 - BAT.z0, BOX);
    const soc = Math.max(0, Math.min(1, (ctx.soc ?? 0) / 100));
    dyn += onSide(X1 + 0.45, BAT.y1 - 0.35, BAT.y1 - 0.2, BAT.z0 + 0.2, BAT.z0 + 0.2 + (BAT.z1 - BAT.z0 - 0.4) * soc, "var(--vce-battery-out-color)", "");
  }
  if (ac) {
    dyn += box(X1, 2.2, 1.4, 0.6, 1.4, 0.9, BOX);
    const c = P([X1 + 0.6, 2.9, 1.85]);
    dyn += `<ellipse cx="${f1(c[0])}" cy="${f1(c[1])}" rx="${f1(0.3 * S)}" ry="${f1(0.38 * S)}" transform="rotate(-30 ${f1(c[0])} ${f1(c[1])})" style="fill:var(--vce-box-side);stroke:${ac.active ? ac.color : "var(--vce-box-line)"};stroke-width:1.2"/>`;
  }
  if (wallbox) {
    dyn += box(GX0 + 0.05, GY1, 0.9, 0.45, 0.18, 0.7, WB);
    const l = P([GX0 + 0.27, GY1 + 0.18, 1.45]);
    dyn += `<circle cx="${f1(l[0])}" cy="${f1(l[1])}" r="1.6" style="fill:${wallbox.active ? wallbox.color : "var(--vce-lamp-off)"}"/>`;
  }
  let front2 = "";
  if (heatPump) {
    front2 += box(6.4, 12.5, 0, 1.7, 0.8, 1.1, BOX);
    const c = P([6.95, 13.3, 0.55]);
    front2 += `<ellipse cx="${f1(c[0])}" cy="${f1(c[1])}" rx="${f1(0.38 * S)}" ry="${f1(0.3 * S)}" transform="rotate(30 ${f1(c[0])} ${f1(c[1])})" style="fill:var(--vce-box-side);stroke:${heatPump.active ? heatPump.color : "var(--vce-box-line)"};stroke-width:1.2"/>`;
    for (const z of [0.3, 0.55, 0.8]) front2 += `<polyline class="slat" points="${pts([[7.5, 13.3, z], [7.95, 13.3, z]])}"/>`;
  }
  let jac = "";
  if (jacuzzi?.active) {
    const { x, y, w } = JAC;
    jac += box(x - 0.3, y - 0.3, 0, w + 0.6, w + 0.6, 0.12, DECK) + box(x, y, 0.12, w, w, 0.85, DECK);
    jac += poly([[x + 0.2, y + 0.2, 0.97], [x + w - 0.2, y + 0.2, 0.97], [x + w - 0.2, y + w - 0.2, 0.97], [x + 0.2, y + w - 0.2, 0.97]], `url(#${uid}-water)`, "");
    for (const [bx, by, d] of [[0.6, 0.7, 0], [1.4, 1.1, 0.8], [0.9, 1.7, 1.5], [1.8, 0.6, 0.4], [1.2, 1.4, 2.0], [1.9, 1.8, 1.1]]) {
      const b = P([x + bx, y + by, 0.97]);
      jac += `<circle class="bubble" cx="${f1(b[0])}" cy="${f1(b[1])}" r="1.1" style="animation-delay:${d}s"/>`;
    }
    for (const [sx, d] of [[0.8, 0], [1.5, 1.4], [1.1, 2.8]]) {
      const b = P([x + sx, y + 1.2, 1.2]);
      jac += `<path class="steam" d="M${f1(b[0])},${f1(b[1])} c-3,-4 3,-7 0,-11" style="animation-delay:${d}s"/>`;
    }
  }

  // ---- flows and labels (clickable Lit templates)
  const flow = (d: string, watts: number, color: string, reverse = false) => svg`
    <path class="cable" d=${d}></path>
    <path class="flow ${watts >= ctx.threshold ? "on" : ""}" d=${d}
      style=${styleMap({ stroke: color, animationDuration: `${flowDuration(watts)}s`, animationDirection: reverse ? "reverse" : "normal" })}></path>`;

  /** stack: extra vertical room per +100 % label size, so stacked labels on the right do not collide. */
  const label = (anchor: V3, dx: number, dy: number, watts: number, name: string, entity?: string, stack = 0) => {
    const [value, unit] = ctx.power(watts);
    const a = P(anchor), y = a[1] + dy + stack * (k - 1);
    const x = clampLabelX(a[0] + dx, `${value} ${unit}`, name, 22 * k, 12 * k, 480);
    const c = clickable(ctx, entity);
    return svg`
      <line class="leader" x1=${f1(a[0])} y1=${f1(a[1])} x2=${f1(x)} y2=${f1(y + (dy < 0 ? 22 * k : -16 * k))}></line>
      <g class="label ${entity ? "link" : ""}" role=${ifDefined(c.role)} tabindex=${ifDefined(c.tabindex)} @click=${c.onClick} @keydown=${c.onKey}>
        <text x=${f1(x)} y=${f1(y)} text-anchor="middle"><tspan class="val">${value}</tspan><tspan class="unit" dx="2">${unit}</tspan></text>
        <text class="name" x=${f1(x)} y=${f1(y + 15 * k)} text-anchor="middle">${name}</text>
      </g>`;
  };
  const lamps = (list: [number, number][], state: typeof front) => {
    if (!state) return nothing;
    const c = clickable(ctx, state.entity);
    return svg`<g class="lamps link ${state.on ? "on" : ""}" role=${ifDefined(c.role)} tabindex=${ifDefined(c.tabindex)}
      @click=${c.onClick} @keydown=${c.onKey}><title>${state.name}</title>${unsafeSVG(list.map(([x, y]) => bollard(x, y, uid)).join(""))}</g>`;
  };

  const socLabel = hasBattery && ctx.soc !== undefined ? ` · ${Math.round(ctx.soc)} %` : "";
  const batteryName =
    (f.charge ? t("label.battery_charging") : f.discharge ? t("label.battery_discharging") : t("label.battery")) + socLabel;

  return svg`
    <svg class="scene terraced" viewBox="0 4 480 362" role="img" aria-label=${t("label.view_house")}
      style=${`--vce-indoor:${indoor?.on ? (0.25 + 0.75 * indoor.brightness).toFixed(2) : 0};--vce-indoor-color:${indoor?.color ?? "#ffca28"}`}>
      <defs>
        <radialGradient id="${uid}-pool"><stop offset="0" stop-color="#ffcf6e" stop-opacity=".45"></stop><stop offset="1" stop-color="#ffcf6e" stop-opacity="0"></stop></radialGradient>
        <linearGradient id="${uid}-water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4fc3f7"></stop><stop offset="1" stop-color="#0288d1"></stop></linearGradient>
      </defs>
      ${unsafeSVG(BACKDROP)}
      ${unsafeSVG(jac)}
      ${lamps(GARDEN_LAMPS, garden)}
      ${unsafeSVG(GARAGE_ROW)}
      ${unsafeSVG(NEIGHBOUR)}
      ${unsafeSVG(HOUSE)}
      ${unsafeSVG(dyn)}

      ${flow(PATHS.pv, f.pv, COLOR.pv)}
      ${hasBattery ? flow(PATHS.battery, batteryPower, f.charge ? COLOR.batIn : COLOR.batOut, f.discharge > 0) : nothing}
      ${flow(PATHS.home, f.home, COLOR.home)}
      ${flow(PATHS.grid, exporting ? f.gridExport : f.gridImport, exporting ? COLOR.gridOut : COLOR.grid, !exporting)}
      ${wallbox ? flow(PATHS.wallbox, wallbox.power, wallbox.color) : nothing}
      ${ac ? flow(PATHS.airConditioner, ac.power, ac.color) : nothing}
      ${heatPump ? flow(PATHS.heatPump, heatPump.power, heatPump.color) : nothing}

      ${unsafeSVG(ANNEX)}
      ${unsafeSVG(front2)}
      ${lamps(FRONT_LAMPS, front)}

      ${label([4, 4.5, H + 0.8], -40, -92, f.pv, t("label.pv"), e.pv)}
      ${hasBattery ? label([X1 + 0.45, 7.2, 2.3], 150, -138, batteryPower, batteryName, e.battery || e.battery_soc, -70) : nothing}
      ${label([4.9, 12, 2.2], -52, 64, f.home, t("label.home"), e.home)}
      ${label([GX0 + 3, 15.2, 0], 96, 18, exporting ? f.gridExport : f.gridImport, exporting ? t("label.grid_export") : t("label.grid_import"), e.grid)}
      ${wallbox ? label([GX0 + GW * 0.5, GY1, 2.8], 104, -88, wallbox.power, wallbox.active ? t("label.wallbox_charging") : wallbox.name, wallbox.entity, -20) : nothing}
      ${ac ? label([X1 + 0.6, 2.9, 2.3], 138, 82, ac.power, ac.name, ac.entity, 50) : nothing}
      ${heatPump ? label([7.2, 12.9, 1.1], -8, 102, heatPump.power, heatPump.name, heatPump.entity) : nothing}
      ${jacuzzi?.active ? label([19.6, -3.6, 1.0], 30, -34, jacuzzi.power, jacuzzi.name, jacuzzi.entity, 20) : nothing}
    </svg>`;
}
