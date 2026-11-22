import { nothing, svg, type SVGTemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { styleMap } from "lit/directives/style-map.js";
import { DEVICE_COLORS } from "../const";
import { flowDuration } from "../format";
import { clickable, COLOR, type ViewContext } from "./context";
import {
  cuboid,
  DARK,
  DOOR,
  fan,
  pathPoint,
  plain,
  pt,
  pts,
  slats,
  WALL,
  WHITE,
  windowOn,
  type Pt,
} from "./geometry";

/* Roof panels: 5×2 modules on the front roof slope. */
const RP = (u: number, v: number): Pt => [90 + u * 130 + v * 50, 150 + u * 75 - v * 84];
const PANELS = (() => {
  const out: SVGTemplateResult[] = [];
  const cols = 5, rows = 2, u0 = 0.07, u1 = 0.93, v0 = 0.12, v1 = 0.9, gu = 0.012, gv = 0.03;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ua = u0 + ((u1 - u0) * c) / cols + gu;
      const ub = u0 + ((u1 - u0) * (c + 1)) / cols - gu;
      const va = v0 + ((v1 - v0) * r) / rows + gv;
      const vb = v0 + ((v1 - v0) * (r + 1)) / rows - gv;
      const um = (ua + ub) / 2, vm = (va + vb) / 2;
      out.push(svg`
        <polygon class="panel" points=${pts([RP(ua, va), RP(ub, va), RP(ub, vb), RP(ua, vb)])}></polygon>
        <polyline class="panel-grid" points=${pts([RP(um, va), RP(um, vb)])}></polyline>
        <polyline class="panel-grid" points=${pts([RP(ua, vm), RP(ub, vm)])}></polyline>`);
    }
  }
  return out;
})();

/* Facade: windows, front door with canopy and step. Static, so built once. */
const FACADE = (() => {
  const f = WALL.f;
  const knob = f.p(DOOR.u1 - 0.02, 46);
  return svg`
    ${windowOn("f", 0.17, 0.33, 16, 42)}
    ${windowOn("f", 0.82, 0.95, 4, 25)}
    ${windowOn("r", 0.44, 0.56, -34, -16, false)}
    ${plain([f.p(DOOR.u0, 22), f.p(DOOR.u1, 22), f.p(DOOR.u1, 65), f.p(DOOR.u0, 65)], "var(--vce-door)")}
    ${plain([f.p(DOOR.u0 + 0.015, 27), f.p(DOOR.u1 - 0.015, 27), f.p(DOOR.u1 - 0.015, 40), f.p(DOOR.u0 + 0.015, 40)], "var(--vce-window)")}
    <circle cx=${knob[0].toFixed(1)} cy=${knob[1].toFixed(1)} r="1.1" style="fill:var(--vce-sill)"></circle>
    ${cuboid("f", DOOR.u0 - 0.02, DOOR.u1 + 0.02, 17, 19, 7, DARK).tpl}
    ${cuboid("f", DOOR.u0 - 0.01, DOOR.u1 + 0.01, 62, 65, 5, ["var(--vce-path)", "var(--vce-path)", "var(--vce-path-joint)"]).tpl}`;
})();

const WALKWAY = (() => {
  const a = DOOR.u0 - 0.005, b = DOOR.u1 + 0.005;
  const joints: SVGTemplateResult[] = [];
  for (let t = 0.14; t < 1; t += 0.14) {
    joints.push(svg`<polyline class="joint" points=${pts([pathPoint(a, t), pathPoint(b, t)])}></polyline>`);
  }
  return svg`${plain([pathPoint(a, 0), pathPoint(b, 0), pathPoint(b, 1), pathPoint(a, 1)], "var(--vce-path)")}${joints}`;
})();

/* Outdoor lighting: one wall light above the door, three bollards along the walkway. */
const SCONCE = { u: (DOOR.u0 + DOOR.u1) / 2, h: 9 };
const BOLLARDS: Pt[] = [
  pathPoint(DOOR.u0 - 0.05, 0.35),
  pathPoint(DOOR.u1 + 0.05, 0.6),
  pathPoint(DOOR.u0 - 0.05, 0.9),
];

const PATH = {
  pv: "M196,211 L220,225 L220,240 L242,227.2",
  battery: "M254,235.3 L264,229.5",
  home: "M242,242 L220,254.8 L168,224.8",
  grid: "M248,251 L248,274 L448,389.4",
  wallbox: "M168,231 L175.8,235.5",
  heatPump: "M254,247 L254,270 L298,244.5 L304,248",
  airConditioner: "M157.6,215 L157.6,197 L108.2,168.5",
};

export function renderHouse(ctx: ViewContext, uid: string): SVGTemplateResult {
  const { flows: f, t, config } = ctx;
  const e = config.entities;
  const hasBattery = !!e.battery || !!e.battery_soc;
  const wallbox = ctx.devices.find((d) => d.kind === "wallbox");
  const heatPump = ctx.devices.find((d) => d.kind === "heat_pump");
  const airConditioner = ctx.devices.find((d) => d.kind === "air_conditioner");
  const lighting = ctx.lighting;
  const lit = !!lighting?.on;
  const batteryPower = f.charge || f.discharge;
  const exporting = f.gridExport > f.gridImport;
  const id = (name: string) => `${uid}-${name}`;

  const flow = (d: string, watts: number, color: string, reverse = false) => svg`
    <path class="cable" d=${d}></path>
    <path
      class="flow ${watts >= ctx.threshold ? "on" : ""}"
      d=${d}
      style=${styleMap({
        stroke: color,
        animationDuration: `${flowDuration(watts)}s`,
        animationDirection: reverse ? "reverse" : "normal",
      })}
    ></path>`;

  const label = (x: number, y: number, watts: number, name: string, entity?: string, sub?: string) => {
    const [value, unit] = ctx.power(watts);
    const c = clickable(ctx, entity);
    return svg`
      <g class="label ${entity ? "link" : ""}" role=${ifDefined(c.role)} tabindex=${ifDefined(c.tabindex)}
        @click=${c.onClick} @keydown=${c.onKey}>
        <text x=${x} y=${y} text-anchor="middle"><tspan class="val">${value}</tspan><tspan class="unit" dx="2">${unit}</tspan></text>
        ${sub ? svg`<text class="sub" x=${x} y=${y + 19} text-anchor="middle">${sub}</text>` : nothing}
        <text class="name" x=${x} y=${y + (sub ? 37 : 18)} text-anchor="middle">${name}</text>
      </g>`;
  };
  const led = (c: ReturnType<typeof cuboid>, s0: number, s1: number, t0: number, t1: number, on: boolean, color: string) =>
    plain(c.quad(s0, s1, t0, t1), on ? color : "var(--vce-lamp-off)");

  // ---- devices on the walls
  const meter = cuboid("f", 0.52, 0.6, 22, 40, 4, WHITE);
  const inverter = cuboid("r", 0.22, 0.34, 18, 42, 6, WHITE);
  const battery = cuboid("r", 0.43, 0.62, 8, 58, 11, WHITE);
  const soc = Math.max(0, Math.min(1, (ctx.soc ?? 0) / 100));

  const wallboxTpl = (() => {
    if (!wallbox) return nothing;
    const c = cuboid("f", 0.66, 0.75, 16, 46, 7, DARK);
    const tip = c.face(0.5, 1);
    const cable = `M${pt(tip)} C${(tip[0] + 2).toFixed(1)},${(tip[1] + 16).toFixed(1)} ${(tip[0] + 14).toFixed(1)},${(tip[1] + 18).toFixed(1)} ${(tip[0] + 17).toFixed(1)},${(tip[1] + 9).toFixed(1)}`;
    return svg`
      ${flow(PATH.wallbox, wallbox.power, wallbox.color)}
      ${c.tpl}
      ${plain(c.quad(0.2, 0.8, 0.12, 0.36), wallbox.active ? "#cfe8d0" : "#5d6a71")}
      ${led(c, 0.4, 0.6, 0.46, 0.52, wallbox.active, DEVICE_COLORS.wallbox)}
      <path class="wallbox-cable" d=${cable}></path>
      <line class="leader" x1="182" y1="254" x2="238" y2="316"></line>
      ${label(252, 340, wallbox.power, wallbox.active ? t("label.wallbox_charging") : wallbox.name, wallbox.entity)}`;
  })();

  const heatPumpTpl = (() => {
    if (!heatPump) return nothing;
    const c = cuboid("r", 0.76, 0.98, 38, 62, 16, WHITE, 3);
    const feet = [c.face(0.1, 1), c.face(0.9, 1)].map(
      (p) => svg`<line class="foot" x1=${p[0].toFixed(1)} y1=${p[1].toFixed(1)} x2=${p[0].toFixed(1)} y2=${(p[1] + 3).toFixed(1)}></line>`,
    );
    return svg`
      ${flow(PATH.heatPump, heatPump.power, heatPump.color)}
      ${feet}${c.tpl}
      ${fan(c.face(0.36, 0.5), -30, heatPump.active, heatPump.color)}
      ${slats(c, 0.7, 0.92, [0.2, 0.35, 0.5, 0.65, 0.8])}
      <line class="leader" x1="378" y1="214" x2="340" y2="226"></line>
      ${label(404, 188, heatPump.power, heatPump.name, heatPump.entity)}`;
  })();

  const airConditionerTpl = (() => {
    if (!airConditioner) return nothing;
    const c = cuboid("f", 0.03, 0.14, 6, 26, 10, WHITE);
    return svg`
      ${flow(PATH.airConditioner, airConditioner.power, airConditioner.color)}
      ${c.tpl}
      ${fan(c.face(0.62, 0.5), 30, airConditioner.active, airConditioner.color)}
      ${slats(c, 0.08, 0.3, [0.25, 0.5, 0.75])}
      <line class="leader" x1="88" y1="180" x2="58" y2="188"></line>
      ${label(46, 210, airConditioner.power, airConditioner.name, airConditioner.entity)}`;
  })();

  // ---- outdoor lighting (only when configured)
  const sconce = cuboid("f", SCONCE.u - 0.014, SCONCE.u + 0.014, SCONCE.h, SCONCE.h + 5, 3, DARK);
  const sconceBulb = sconce.face(0.5, 1);
  const wf = WALL.f;
  const lightGround = lighting
    ? svg`<g class="glow">${BOLLARDS.map(
        ([x, y]) => svg`<ellipse cx=${x.toFixed(1)} cy=${(y + 1).toFixed(1)} rx="15" ry="7.5" fill="url(#${id("pool")})"></ellipse>`,
      )}</g>`
    : nothing;
  const lightWash = lighting
    ? svg`<g class="glow"><polygon fill="url(#${id("wash")})" points=${pts([
        wf.p(SCONCE.u - 0.02, SCONCE.h + 5),
        wf.p(SCONCE.u + 0.02, SCONCE.h + 5),
        wf.p(SCONCE.u + 0.06, SCONCE.h + 40),
        wf.p(SCONCE.u - 0.06, SCONCE.h + 40),
      ])}></polygon></g>`
    : nothing;
  const lamps = lighting
    ? (() => {
        const c = clickable(ctx, lighting.entity);
        return svg`
          <g class="lamps link" role=${ifDefined(c.role)} tabindex=${ifDefined(c.tabindex)} @click=${c.onClick} @keydown=${c.onKey}>
            <title>${lighting.name}</title>
            ${sconce.tpl}
            <circle class="glow" cx=${sconceBulb[0].toFixed(1)} cy=${(sconceBulb[1] + 1).toFixed(1)} r="5" fill="url(#${id("bulb")})"></circle>
            ${BOLLARDS.map(([x, y]) => svg`
              <ellipse cx=${x.toFixed(1)} cy=${y.toFixed(1)} rx="2.2" ry="1.1" style="fill:var(--vce-dev-dark-side)"></ellipse>
              <rect x=${(x - 1.4).toFixed(1)} y=${(y - 10).toFixed(1)} width="2.8" height="10" style="fill:var(--vce-dev-dark)"></rect>
              <rect class="lamp-head" x=${(x - 2).toFixed(1)} y=${(y - 14).toFixed(1)} width="4" height="4" rx=".8"></rect>
              <rect x=${(x - 2.4).toFixed(1)} y=${(y - 15.5).toFixed(1)} width="4.8" height="1.8" rx=".8" style="fill:var(--vce-dev-dark)"></rect>
              <circle class="glow" cx=${x.toFixed(1)} cy=${(y - 12).toFixed(1)} r="6" fill="url(#${id("bulb")})"></circle>`)}
          </g>`;
      })()
    : nothing;

  return svg`
    <svg class="scene ${lit ? "lit" : ""}" viewBox="0 0 480 395" role="img" aria-label=${t("label.view_house")}>
      <defs>
        <radialGradient id=${id("pool")}><stop offset="0" stop-color="#ffcf6e" stop-opacity=".38"></stop><stop offset="1" stop-color="#ffcf6e" stop-opacity="0"></stop></radialGradient>
        <linearGradient id=${id("wash")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a" stop-opacity=".4"></stop><stop offset="1" stop-color="#ffd27a" stop-opacity="0"></stop></linearGradient>
        <radialGradient id=${id("bulb")}><stop offset="0" stop-color="#fff1c4" stop-opacity=".95"></stop><stop offset=".35" stop-color="#ffd27a" stop-opacity=".5"></stop><stop offset="1" stop-color="#ffd27a" stop-opacity="0"></stop></radialGradient>
      </defs>
      <polygon class="ground" points="62,214 222,306 360,226 200,134"></polygon>
      ${WALKWAY}
      ${lightGround}
      <polygon class="wall-l" points="90,150 220,225 220,290 90,215"></polygon>
      <polygon class="wall-r" points="220,225 320,167 320,232 220,290"></polygon>
      <polygon class="wall-r" points="220,225 320,167 270,141"></polygon>
      ${FACADE}
      ${lightWash}
      <polygon class="roof" points="90,150 220,225 270,141 140,66"></polygon>
      ${PANELS}
      <polyline class="roof-edge" points="90,150 220,225 270,141 320,167"></polyline>
      <polyline class="roof-edge" points="140,66 270,141"></polyline>

      ${flow(PATH.pv, f.pv, COLOR.pv)}
      ${hasBattery ? flow(PATH.battery, batteryPower, f.charge ? COLOR.batIn : COLOR.batOut, f.discharge > 0) : nothing}
      ${flow(PATH.home, f.home, COLOR.home)}
      ${flow(PATH.grid, exporting ? f.gridExport : f.gridImport, exporting ? COLOR.gridOut : COLOR.grid, !exporting)}

      ${meter.tpl}${plain(meter.quad(0.2, 0.8, 0.15, 0.4), "var(--vce-dev-dark)")}
      ${inverter.tpl}
      ${plain(inverter.quad(0.2, 0.8, 0.14, 0.36), "var(--vce-dev-dark)")}
      ${led(inverter, 0.2, 0.3, 0.5, 0.56, f.pv >= ctx.threshold, DEVICE_COLORS.wallbox)}
      ${hasBattery
        ? svg`
          ${battery.tpl}
          ${plain(battery.quad(0.68, 0.84, 0.12, 0.88), "var(--vce-dev-dark-side)")}
          ${plain(battery.quad(0.68, 0.84, 0.88 - 0.76 * soc, 0.88), COLOR.batOut)}
          ${led(battery, 0.18, 0.3, 0.1, 0.13, batteryPower >= ctx.threshold, COLOR.batOut)}
          ${slats(battery, 0.18, 0.5, [0.3, 0.4, 0.5, 0.6, 0.7])}`
        : nothing}

      ${airConditionerTpl}
      ${wallboxTpl}
      ${heatPumpTpl}
      ${lamps}

      <line class="leader" x1="180" y1="60" x2="180" y2="145"></line>
      ${label(180, 34, f.pv, t("label.pv"), e.pv)}

      ${hasBattery
        ? svg`
          <line class="leader" x1="276" y1="132" x2="276" y2="200"></line>
          ${label(
            276,
            86,
            batteryPower,
            f.charge ? t("label.battery_charging") : f.discharge ? t("label.battery_discharging") : t("label.battery"),
            e.battery || e.battery_soc,
            ctx.soc !== undefined ? `${Math.round(ctx.soc)} %` : undefined,
          )}`
        : nothing}

      <line class="leader" x1="160" y1="238" x2="160" y2="320"></line>
      ${label(160, 344, f.home, t("label.home"), e.home)}

      <line class="leader" x1="390" y1="302" x2="390" y2="355"></line>
      ${label(
        390,
        276,
        exporting ? f.gridExport : f.gridImport,
        exporting ? t("label.grid_export") : t("label.grid_import"),
        e.grid,
      )}
    </svg>`;
}
