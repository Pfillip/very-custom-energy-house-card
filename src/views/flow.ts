import { mdiBatteryHigh, mdiHome, mdiSolarPower, mdiTransmissionTower } from "@mdi/js";
import { nothing, svg, type SVGTemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { keyed } from "lit/directives/keyed.js";
import { flowDuration } from "../format";
import type { DeviceState } from "../types";
import { clickable, COLOR, type ViewContext } from "./context";

/*
 * Flow diagram: four nodes (solar top, grid left, home right, battery bottom),
 * plus a column of large-appliance nodes to the right of home.
 * The core diagram is drawn in its own coordinates and shifted 30px left.
 */

const R = 38;
const HOME = { x: 428, y: 190 };
const PATHS = {
  "pv-home": "M262,98 C262,170 300,184 390,184",
  "pv-grid": "M238,98 C238,170 200,184 110,184",
  "pv-bat": "M250,100 V280",
  "grid-home": "M110,190 H390",
  "grid-bat": "M110,196 C200,196 238,210 238,282",
  "bat-home": "M262,282 C262,210 300,196 390,196",
} as const;

const icon = (path: string, x: number, y: number, size: number, color: string) => svg`
  <svg x=${x} y=${y} width=${size} height=${size} viewBox="0 0 24 24"><path d=${path} fill=${color}></path></svg>`;

/** Two dots moving along a path. Keyed by speed so SMIL restarts when the speed changes. */
function dots(pathId: string, watts: number, color: string): SVGTemplateResult {
  const dur = Math.round(flowDuration(watts) * 1.4 * 10) / 10;
  return keyed(
    `${pathId}-${dur}`,
    svg`${[0, 1].map(
      (i) => svg`
        <circle class="dot" r="4.5" fill=${color}>
          <animateMotion dur="${dur}s" begin="${(-i * dur) / 2}s" repeatCount="indefinite" calcMode="linear">
            <mpath href="#${pathId}"></mpath>
          </animateMotion>
        </circle>`,
    )}`,
  ) as unknown as SVGTemplateResult;
}

export function renderFlow(ctx: ViewContext, uid: string): SVGTemplateResult {
  const { flows: f, t, config } = ctx;
  const e = config.entities;
  const hasBattery = !!e.battery || !!e.battery_soc;
  const devices = ctx.devices.filter((d) => d.visible);
  const on = (w: number) => w >= ctx.threshold;
  const id = (k: string) => `${uid}-${k}`;

  const flows: [keyof typeof PATHS, number, string][] = [
    ["pv-home", f.pvHome, COLOR.pv],
    ["pv-grid", f.pvGrid, COLOR.gridOut],
    ["pv-bat", hasBattery ? f.pvBat : 0, COLOR.pv],
    ["grid-home", f.gridHome, COLOR.grid],
    ["grid-bat", hasBattery ? f.gridBat : 0, COLOR.grid],
    ["bat-home", hasBattery ? f.batHome : 0, COLOR.batOut],
  ];

  // Home ring: share of each source
  const C = 2 * Math.PI * R;
  let offset = 0;
  const ring = [
    [f.pvHome, COLOR.pv],
    [f.batHome, COLOR.batOut],
    [f.gridHome, COLOR.grid],
  ].map(([w, color]) => {
    const watts = w as number;
    if (watts <= 0 || f.home <= 0) return nothing;
    const len = (C * watts) / f.home;
    const seg = svg`<circle cx=${HOME.x} cy=${HOME.y} r=${R} fill="none" stroke=${color} stroke-width="3.5"
      stroke-dasharray="${len} ${C - len}" stroke-dashoffset=${-offset}></circle>`;
    offset += len;
    return seg;
  });

  const node = (cx: number, cy: number, color: string, entity: string | undefined, content: SVGTemplateResult) => {
    const c = clickable(ctx, entity);
    return svg`<g class="node ${entity ? "link" : ""}" role=${ifDefined(c.role)} tabindex=${ifDefined(c.tabindex)}
        @click=${c.onClick} @keydown=${c.onKey}>
        <circle class="node-ring" cx=${cx} cy=${cy} r=${R} style="stroke:${color}"></circle>${content}</g>`;
  };

  const s = (w: number) => ctx.power(w).join(" ");
  // Up to five nodes keep a 72px rhythm; more are squeezed to stay inside the 380px viewBox.
  const gap = devices.length > 1 ? Math.min(72, 300 / (devices.length - 1)) : 0;
  const deviceNode = (d: DeviceState, i: number) => {
    const y = 190 + (i - (devices.length - 1) / 2) * gap;
    const c = clickable(ctx, d.entity);
    const pathId = id(`dev-${i}`);
    return svg`
      <path class="fl-line ${d.active ? "on" : ""}" id=${pathId} d="M436,190 C456,190 450,${y} 466,${y}"
        style=${d.active ? `stroke:${d.color}` : ""}></path>
      ${d.active && config.animation !== false ? dots(pathId, d.power, d.color) : nothing}
      <g class="node link" role=${ifDefined(c.role)} tabindex=${ifDefined(c.tabindex)} @click=${c.onClick} @keydown=${c.onKey}>
        <title>${d.name}</title>
        <circle cx="488" cy=${y} r="21" class="dev-ring" style="stroke:${d.active ? d.color : "var(--vce-idle-color)"}"></circle>
        ${icon(d.icon, 478, y - 10, 20, d.active ? d.color : "var(--secondary-text-color)")}
        <text class="small ${d.active ? "" : "muted"}" x="488" y=${y + 35} text-anchor="middle">${d.active ? s(d.power) : t("label.off")}</text>
      </g>`;
  };

  return svg`
    <svg class="scene" viewBox=${devices.length ? "0 0 520 380" : "0 0 440 380"} role="img" aria-label=${t("label.view_flow")}>
      ${devices.map(deviceNode)}
      <g transform="translate(-30,0)">
        ${flows.map(([k, w, color]) => svg`<path class="fl-line ${on(w) ? "on" : ""}" id=${id(k)} d=${PATHS[k]}
          style=${on(w) ? `stroke:${color}` : ""}></path>`)}
        ${config.animation !== false ? flows.filter(([, w]) => on(w)).map(([k, w, color]) => dots(id(k), w, color)) : nothing}

        ${node(250, 62, COLOR.pv, e.pv, svg`
          ${icon(mdiSolarPower, 240, 34, 20, COLOR.pv)}
          <text class="strong" x="250" y="76" text-anchor="middle">${s(f.pv)}</text>`)}
        <text class="name" x="250" y="14" text-anchor="middle">${t("label.pv")}</text>

        ${node(72, 190, COLOR.grid, e.grid, svg`
          ${icon(mdiTransmissionTower, 62, 160, 20, "var(--primary-text-color)")}
          <text class="small" x="72" y="198" text-anchor="middle" style="fill:${COLOR.gridOut}">← ${s(f.gridExport)}</text>
          <text class="small" x="72" y="213" text-anchor="middle" style="fill:${COLOR.grid}">→ ${s(f.gridImport)}</text>`)}
        <text class="name" x="72" y="246" text-anchor="middle">${t("label.grid")}</text>

        <g class="node ${e.home ? "link" : ""}" role=${ifDefined(e.home ? "button" : undefined)}
          tabindex=${ifDefined(e.home ? 0 : undefined)}
          @click=${clickable(ctx, e.home).onClick} @keydown=${clickable(ctx, e.home).onKey}>
          <circle class="node-ring" cx=${HOME.x} cy=${HOME.y} r=${R} style="stroke:var(--vce-idle-color)"></circle>
          <g transform="rotate(-90 ${HOME.x} ${HOME.y})">${ring}</g>
          ${icon(mdiHome, 417, 164, 22, "var(--primary-text-color)")}
          <text class="strong" x="428" y="205" text-anchor="middle" style="fill:${COLOR.home}">${s(f.home)}</text>
        </g>
        <text class="name" x="428" y="246" text-anchor="middle">${t("label.home")}</text>

        ${hasBattery
          ? svg`
            ${node(250, 318, COLOR.batOut, e.battery || e.battery_soc, svg`
              ${ctx.soc !== undefined ? svg`<text class="small" x="250" y="296" text-anchor="middle" style="fill:${COLOR.batOut}">${Math.round(ctx.soc)} %</text>` : nothing}
              ${icon(mdiBatteryHigh, 242, 299, 16, "var(--primary-text-color)")}
              <text class="small" x="250" y="329" text-anchor="middle" style="fill:${COLOR.batIn}">↓ ${s(f.charge)}</text>
              <text class="small" x="250" y="343" text-anchor="middle" style="fill:${COLOR.batOut}">↑ ${s(f.discharge)}</text>`)}
            <text class="name" x="250" y="374" text-anchor="middle">${t("label.battery")}</text>`
          : nothing}
      </g>
    </svg>`;
}
