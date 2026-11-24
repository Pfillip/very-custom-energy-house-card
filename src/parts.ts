import { mdiLightbulbOutline, mdiOutdoorLamp } from "@mdi/js";
import { html, nothing, type TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import {
  activeThreshold,
  computeFlows,
  consumerColor,
  deviceStates,
  lightingState,
  needsDarkText,
  readNumber,
  readPower,
  safeColor,
  sourceValues,
} from "./compute";
import { UNTRACKED_COLOR } from "./const";
import { numberFormatter, powerFormatter } from "./format";
import { localizer } from "./localize/localize";
import type { CardConfig, FontWeight, HomeAssistant } from "./types";
import type { ViewContext } from "./views/context";

/*
 * Parts shared by the house card and the bar card: context building, chips,
 * consumption bar and key figures.
 */

const FONT_WEIGHTS: Record<FontWeight, number> = { light: 300, regular: 400, medium: 500, bold: 700 };

export function buildContext(hass: HomeAssistant, config: CardConfig, moreInfo: (id?: string) => void): ViewContext {
  const t = localizer(hass);
  return {
    hass,
    config,
    flows: computeFlows(sourceValues(hass, config)),
    devices: deviceStates(hass, config, t),
    lighting: lightingState(hass, config, t, "lighting"),
    gardenLighting: lightingState(hass, config, t, "garden_lighting"),
    indoorLighting: lightingState(hass, config, t, "indoor_lighting"),
    soc: readNumber(hass, config.entities.battery_soc),
    threshold: activeThreshold(config),
    t,
    power: powerFormatter(hass),
    moreInfo,
  };
}

/** All entity ids a config reads; used to skip re-renders for unrelated state changes. */
export function configEntityIds(c: CardConfig): string[] {
  const d = c.devices ?? {};
  const ids = [
    ...Object.values(c.entities ?? {}).filter((v): v is string => typeof v === "string"),
    d.wallbox?.entity,
    d.heat_pump?.entity,
    d.air_conditioner?.entity,
    d.jacuzzi?.entity,
    d.water_heater?.entity,
    ...(d.heating_rods?.entities ?? []).map((r) => r.entity),
    ...(["lighting", "garden_lighting", "indoor_lighting"] as const).flatMap((k) => [
      d[k]?.entity,
      d[k]?.power,
      d[k]?.brightness,
    ]),
    ...(c.consumers ?? []).map((r) => r.entity),
    ...Object.values(c.kpis ?? {}).map((k) => k?.entity),
  ];
  return ids.filter((id): id is string => !!id);
}

/** True when any entity used by the config changed between two hass objects. */
export function configChanged(config: CardConfig | undefined, old: HomeAssistant | undefined, hass: HomeAssistant | undefined): boolean {
  if (!config || !old || !hass) return true;
  if (old.themes?.darkMode !== hass.themes?.darkMode || old.locale !== hass.locale) return true;
  return configEntityIds(config).some((id) => old.states[id] !== hass.states[id]);
}

export function renderWarnings(ctx: ViewContext): TemplateResult | typeof nothing {
  const missing = configEntityIds(ctx.config).filter((id) => !ctx.hass.states[id]);
  return missing.length
    ? html`<div class="warning">${missing.map((id) => html`<div>${ctx.t("label.entity_unavailable", { entity: id })}</div>`)}</div>`
    : nothing;
}

/** Lighting groups and indoor appliances (water heater, heating rods) as chips. */
export function renderChips(ctx: ViewContext): TemplateResult | typeof nothing {
  const inner = ctx.devices.filter((d) => (d.kind === "water_heater" || d.kind === "heating_rod") && d.visible);
  const lights = [ctx.indoorLighting, ctx.lighting, ctx.gardenLighting].filter((l): l is NonNullable<typeof l> => !!l);
  if (!inner.length && !lights.length) return nothing;
  return html`<div class="chips">
    ${lights.map(
      (light) => html`<button
        class="chip ${light.on ? "on" : ""}"
        style=${styleMap({ "--chip-color": light.color })}
        @click=${() => ctx.moreInfo(light.entity)}
      >
        <ha-svg-icon .path=${light.kind === "indoor_lighting" ? mdiLightbulbOutline : mdiOutdoorLamp}></ha-svg-icon>
        ${light.name}
        <span class="state"
          >${light.on ? ctx.t("label.on") : ctx.t("label.off")}${light.on && light.brightness < 1
            ? ` · ${Math.round(light.brightness * 100)} %`
            : ""}</span
        >
      </button>`,
    )}
    ${inner.map(
      (d) => html`<button
        class="chip ${d.active ? "on" : ""}"
        style=${styleMap({ "--chip-color": d.color })}
        @click=${() => ctx.moreInfo(d.entity)}
      >
        <ha-svg-icon .path=${d.icon}></ha-svg-icon>
        ${d.name} ${d.active ? html`<b>${ctx.power(d.power).join(" ")}</b>` : nothing}
        <span class="state">${d.active ? ctx.t("label.active") : ctx.t("label.off")}</span>
      </button>`,
    )}
  </div>`;
}

export function renderConsumption(ctx: ViewContext): TemplateResult | typeof nothing {
  const { flows, devices } = ctx;
  const consumers = ctx.config.consumers ?? [];
  if (!consumers.length && !devices.length) return nothing;
  const hass = ctx.hass;
  const items: { name: string; color: string; power: number; entity?: string }[] = [
    ...consumers.map((c, i) => ({
      name: c.name || hass.states[c.entity]?.attributes.friendly_name || c.entity,
      color: consumerColor(i, c.color),
      power: Math.max(0, readPower(hass, c.entity) ?? 0),
      entity: c.entity,
    })),
    ...devices.map((d) => ({ name: d.name, color: d.color, power: d.power, entity: d.entity })),
  ].filter((i) => i.power > 0);
  const tracked = items.reduce((sum, i) => sum + i.power, 0);
  const total = Math.max(flows.home, tracked);
  const untracked = total - tracked;
  if (untracked > 0) items.push({
      name: ctx.t("label.untracked"),
      color: safeColor(ctx.config.untracked_color, UNTRACKED_COLOR),
      power: untracked,
    });
  const n0 = numberFormatter(hass);
  const n1 = numberFormatter(hass, 1);

  return html`<div class="consumption">
    <div class="consumption-row">
      <div class="total" style=${styleMap({ fontWeight: String(FONT_WEIGHTS[ctx.config.total_font_weight ?? "light"]) })}>${n0(total)}<small>W</small></div>
      <div class="bar">
        ${items.map((i) => {
          const pct = total > 0 ? (i.power / total) * 100 : 0;
          const text = pct >= 22 && i.entity ? ctx.power(i.power).join(" ") : pct >= 7 ? `${Math.round(pct)}%` : "";
          return html`<div
            class="segment ${needsDarkText(i.color) ? "dark" : ""}"
            style=${styleMap({ flexGrow: String(i.power), background: i.color })}
            title="${i.name}: ${n0(i.power)} W (${n1(pct)} %)"
            @click=${() => ctx.moreInfo(i.entity)}
          >
            <span>${text}</span>
          </div>`;
        })}
      </div>
    </div>
    <div class="legend">
      ${items.map(
        (i) => html`<button @click=${() => ctx.moreInfo(i.entity)} ?disabled=${!i.entity}>
          <i style=${styleMap({ background: i.color })}></i>${i.name}${i.entity ? ` · ${ctx.power(i.power).join(" ")}` : ""}
        </button>`,
      )}
    </div>
  </div>`;
}

/** Formats an entity state with its unit; percentages without decimals. */
function formatEntity(ctx: ViewContext, entityId: string): string {
  const stateObj = ctx.hass.states[entityId];
  if (!stateObj) return "–";
  const unit: string = stateObj.attributes.unit_of_measurement ?? "";
  const value = readNumber(ctx.hass, entityId);
  if (value === undefined) return stateObj.state;
  return `${numberFormatter(ctx.hass, unit === "%" ? 0 : 1)(value)}${unit ? ` ${unit}` : ""}`;
}

export function renderKpis(ctx: ViewContext): TemplateResult | typeof nothing {
  const f = ctx.flows;
  const config = ctx.config;
  const k = config.kpis ?? {};
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const slots = [
    {
      entity: k.autarky?.entity,
      name: k.autarky?.name || ctx.t("label.autarky"),
      fallback: f.home > 0 ? pct((f.home - f.gridHome) / f.home) : "–",
    },
    {
      entity: k.self_consumption?.entity,
      name: k.self_consumption?.name || ctx.t("label.self_consumption"),
      fallback: f.pv > 0 ? pct((f.pv - f.pvGrid) / f.pv) : "–",
    },
    {
      entity: k.pv_today?.entity || config.entities.pv_energy_today,
      name: k.pv_today?.name || ctx.t("label.pv_today"),
      fallback: undefined,
    },
  ].filter((s) => s.entity || s.fallback !== undefined);
  if (!slots.length) return nothing;

  return html`<div class="kpis">
    ${slots.map(
      (s) => html`<div
        class="kpi ${s.entity ? "link" : ""}"
        role=${s.entity ? "button" : "group"}
        tabindex=${s.entity ? "0" : "-1"}
        @click=${() => ctx.moreInfo(s.entity)}
        @keydown=${(ev: KeyboardEvent) => (ev.key === "Enter" || ev.key === " ") && ctx.moreInfo(s.entity)}
      >
        <b>${s.entity ? formatEntity(ctx, s.entity) : s.fallback}</b><span>${s.name}</span>
      </div>`,
    )}
  </div>`;
}
