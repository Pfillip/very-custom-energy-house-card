import { nothing, svg, type SVGTemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { styleMap } from "lit/directives/style-map.js";
import { flowDuration } from "../format";
import { clickable, COLOR, type ViewContext } from "./context";

/*
 * Isometric house. Coordinates live in a 480×395 viewBox.
 * Front (eave) wall: (90,150)-(220,225), gable wall: (220,225)-(320,167), wall height 65.
 */

const P = (u: number, v: number): [number, number] => [90 + u * 130 + v * 50, 150 + u * 75 - v * 84];

const PANELS = (() => {
  const out: SVGTemplateResult[] = [];
  const cols = 5, rows = 2, u0 = 0.07, u1 = 0.93, v0 = 0.12, v1 = 0.9, gu = 0.012, gv = 0.03;
  const pts = (list: [number, number][]) => list.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ua = u0 + ((u1 - u0) * c) / cols + gu;
      const ub = u0 + ((u1 - u0) * (c + 1)) / cols - gu;
      const va = v0 + ((v1 - v0) * r) / rows + gv;
      const vb = v0 + ((v1 - v0) * (r + 1)) / rows - gv;
      const um = (ua + ub) / 2, vm = (va + vb) / 2;
      out.push(svg`
        <polygon class="panel" points=${pts([P(ua, va), P(ub, va), P(ub, vb), P(ua, vb)])}></polygon>
        <polyline class="panel-grid" points=${pts([P(um, va), P(um, vb)])}></polyline>
        <polyline class="panel-grid" points=${pts([P(ua, vm), P(ub, vm)])}></polyline>`);
    }
  }
  return out;
})();

const PATH = {
  pv: "M196,211 L220,225 L220,240 L242,227.2",
  battery: "M254,235.3 L275,223.1",
  home: "M242,242 L220,254.8 L183.6,233.8",
  grid: "M248,251 L248,274 L448,389.4",
  wallbox: "M170.6,229 L155,220",
  heatPump: "M254,247 L254,270 L298,244.5 L304,248",
};

export function renderHouse(ctx: ViewContext): SVGTemplateResult {
  const { flows: f, t, config } = ctx;
  const e = config.entities;
  const hasBattery = !!e.battery || !!e.battery_soc;
  const wallbox = ctx.devices.find((d) => d.kind === "wallbox");
  const heatPump = ctx.devices.find((d) => d.kind === "heat_pump");
  const batteryPower = f.charge || f.discharge;
  const exporting = f.gridExport > f.gridImport;

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

  const socTop = 56 - (44 * (ctx.soc ?? 0)) / 100;
  const Pr = (u: number, h: number) => `${220 + 100 * u},${225 - 58 * u + h}`;

  return svg`
    <svg class="scene" viewBox="0 0 480 395" role="img" aria-label=${t("label.view_house")}>
      <polygon class="ground" points="62,214 222,306 360,226 200,134"></polygon>
      <polygon class="wall-l" points="90,150 220,225 220,290 90,215"></polygon>
      <polygon class="wall-r" points="220,225 320,167 320,232 220,290"></polygon>
      <polygon class="wall-r" points="220,225 320,167 270,141"></polygon>
      <polygon class="win" points="109.5,173.3 135.5,188.3 135.5,210.3 109.5,195.3"></polygon>
      <polygon class="roof" points="90,150 220,225 270,141 140,66"></polygon>
      ${PANELS}
      <polyline class="roof-edge" points="90,150 220,225 270,141 320,167"></polyline>
      <polyline class="roof-edge" points="140,66 270,141"></polyline>

      ${flow(PATH.pv, f.pv, COLOR.pv)}
      ${hasBattery ? flow(PATH.battery, batteryPower, f.charge ? COLOR.batIn : COLOR.batOut, f.discharge > 0) : nothing}
      ${flow(PATH.home, f.home, COLOR.home)}
      ${flow(PATH.grid, exporting ? f.gridExport : f.gridImport, exporting ? COLOR.gridOut : COLOR.grid, !exporting)}

      <polygon class="box" points="170.6,218.5 183.6,226 183.6,246 170.6,238.5"></polygon>
      <polygon class="box" points="242,230.2 254,223.3 254,247.3 242,254.2"></polygon>
      ${hasBattery
        ? svg`<polygon class="box" points="275,203.1 295,191.5 295,239.5 275,251.1"></polygon>
              <polygon class="soc" points="${Pr(0.68, socTop)} ${Pr(0.72, socTop)} ${Pr(0.72, 56)} ${Pr(0.68, 56)}"></polygon>`
        : nothing}

      ${wallbox
        ? svg`
          ${flow(PATH.wallbox, wallbox.power, wallbox.color)}
          <polygon class="wallbox" points="144.6,199.5 155,205.5 155,233.5 144.6,227.5"></polygon>
          <polygon class="led ${wallbox.active ? "on" : ""}" points="147.5,206 152,208.6 152,211.6 147.5,209"></polygon>
          <path class="wallbox-cable" d="M148,226 C146,244 132,246 128,238"></path>
          <line class="leader" x1="141" y1="232" x2="96" y2="262"></line>
          ${label(70, 284, wallbox.power, wallbox.active ? t("label.wallbox_charging") : wallbox.name, wallbox.entity)}`
        : nothing}

      ${heatPump
        ? svg`
          ${flow(PATH.heatPump, heatPump.power, heatPump.color)}
          <polygon class="hp-top" points="298,222.8 318,211.2 330,218.2 310,229.8"></polygon>
          <polygon class="hp-side" points="298,222.8 310,229.8 310,251.8 298,244.8"></polygon>
          <polygon class="hp-front" points="310,229.8 330,218.2 330,240.2 310,251.8"></polygon>
          <ellipse class="hp-fan ${heatPump.active ? "on" : ""}" cx="318" cy="235.5" rx="5.5" ry="7.5" transform="rotate(-30 318 235.5)"></ellipse>
          <line class="leader" x1="378" y1="214" x2="334" y2="226"></line>
          ${label(404, 188, heatPump.power, heatPump.name, heatPump.entity)}`
        : nothing}

      <line class="leader" x1="180" y1="60" x2="180" y2="145"></line>
      ${label(180, 34, f.pv, t("label.pv"), e.pv)}

      ${hasBattery
        ? svg`
          <line class="leader" x1="288" y1="132" x2="288" y2="197"></line>
          ${label(
            288,
            86,
            batteryPower,
            f.charge ? t("label.battery_charging") : f.discharge ? t("label.battery_discharging") : t("label.battery"),
            e.battery || e.battery_soc,
            ctx.soc !== undefined ? `${Math.round(ctx.soc)} %` : undefined,
          )}`
        : nothing}

      <line class="leader" x1="177" y1="247" x2="177" y2="320"></line>
      ${label(177, 344, f.home, t("label.home"), e.home)}

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
