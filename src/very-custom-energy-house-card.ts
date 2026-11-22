import { mdiHomeOutline, mdiVectorPolyline } from "@mdi/js";
import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import {
  activeThreshold,
  computeFlows,
  consumerColor,
  deviceStates,
  needsDarkText,
  readNumber,
  readPower,
  sourceValues,
} from "./compute";
import { CARD_TYPE, CARD_VERSION, EDITOR_TYPE, UNTRACKED_COLOR } from "./const";
import "./editor";
import { numberFormatter, powerFormatter } from "./format";
import { localizer } from "./localize/localize";
import { cardStyles } from "./styles";
import type { CardConfig, DeviceState, Flows, HomeAssistant } from "./types";
import type { ViewContext } from "./views/context";
import { renderFlow } from "./views/flow";
import { renderHouse } from "./views/house";

console.info(
  `%c VERY-CUSTOM-ENERGY-HOUSE-CARD %c v${CARD_VERSION} `,
  "color: white; background: #ff9800; font-weight: 700;",
  "color: #ff9800; background: white; font-weight: 700;",
);

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }
  interface HTMLElementTagNameMap {
    [CARD_TYPE]: VeryCustomEnergyHouseCard;
  }
}

let uidCounter = 0;

@customElement(CARD_TYPE)
export class VeryCustomEnergyHouseCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: CardConfig;

  @state() private _view: "house" | "flow" = "house";

  private readonly _uid = `vce${++uidCounter}`;

  static styles = cardStyles;

  public static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TYPE);
  }

  public static getStubConfig(hass: HomeAssistant): Partial<CardConfig> {
    const power = Object.values(hass.states).filter(
      (s) => s.entity_id.startsWith("sensor.") && s.attributes.device_class === "power",
    );
    const find = (re: RegExp, list = power) => list.find((s) => re.test(s.entity_id))?.entity_id;
    const soc = Object.values(hass.states).find(
      (s) => s.attributes.device_class === "battery" && /batter|akku|storage|speicher/i.test(s.entity_id),
    );
    return {
      view: "switch",
      entities: {
        pv: find(/pv|solar/i),
        grid: find(/grid|netz/i),
        battery: find(/batter|akku|storage|speicher/i),
        battery_soc: soc?.entity_id,
      },
      consumers: [],
    };
  }

  public setConfig(config: CardConfig): void {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    if (config.view && !["house", "flow", "switch"].includes(config.view)) {
      throw new Error(`Unknown view "${config.view}" (use house, flow or switch)`);
    }
    if (config.consumers && !Array.isArray(config.consumers)) throw new Error("consumers must be a list");
    this._config = { ...config, entities: { ...(config.entities ?? {}) } };
    if (config.view === "flow") this._view = "flow";
    if (config.view === "house") this._view = "house";
  }

  public getCardSize(): number {
    let size = 7;
    if (this._config?.show_consumers !== false && this._config?.consumers?.length) size += 2;
    if (this._config?.show_kpis !== false) size += 1;
    return size;
  }

  public getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  /** All entity ids this card reads; used to skip re-renders for unrelated state changes. */
  private _entityIds(): string[] {
    const c = this._config;
    if (!c) return [];
    const ids = [
      ...Object.values(c.entities).filter((v): v is string => typeof v === "string"),
      c.devices?.wallbox?.entity,
      c.devices?.heat_pump?.entity,
      c.devices?.water_heater?.entity,
      ...(c.devices?.heating_rods?.entities ?? []).map((r) => r.entity),
      ...(c.consumers ?? []).map((r) => r.entity),
    ];
    return ids.filter((id): id is string => !!id);
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (changed.has("_config") || changed.has("_view")) return true;
    if (!changed.has("hass")) return false;
    const old = changed.get("hass") as HomeAssistant | undefined;
    if (!old || !this.hass) return true;
    if (old.themes?.darkMode !== this.hass.themes?.darkMode || old.locale !== this.hass.locale) return true;
    return this._entityIds().some((id) => old.states[id] !== this.hass!.states[id]);
  }

  protected updated(): void {
    this.toggleAttribute("dark", !!this.hass?.themes?.darkMode);
  }

  private _moreInfo = (entityId?: string): void => {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  };

  protected render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const config = this._config;
    const hass = this.hass;
    const t = localizer(hass);
    const flows = computeFlows(sourceValues(hass, config));
    const devices = deviceStates(hass, config, t);
    const view = config.view === "house" || config.view === "flow" ? config.view : this._view;
    const missing = this._entityIds().filter((id) => !hass.states[id]);

    const ctx: ViewContext = {
      config,
      flows,
      devices,
      soc: readNumber(hass, config.entities.battery_soc),
      threshold: activeThreshold(config),
      t,
      power: powerFormatter(hass),
      moreInfo: this._moreInfo,
    };

    return html`
      <ha-card class=${config.animation === false ? "static" : ""}>
        ${config.title || config.view === "switch" || !config.view
          ? html`<div class="header">
              ${config.title ? html`<h1>${config.title}</h1>` : nothing}
              ${config.view === "switch" || !config.view ? this._renderSwitcher(view, t) : nothing}
            </div>`
          : nothing}
        ${missing.length
          ? html`<div class="warning">${missing.map((id) => html`<div>${t("label.entity_unavailable", { entity: id })}</div>`)}</div>`
          : nothing}
        ${view === "house" ? renderHouse(ctx) : renderFlow(ctx, this._uid)}
        ${view === "house" ? this._renderChips(ctx) : nothing}
        ${config.show_consumers !== false ? this._renderConsumption(flows, devices, ctx) : nothing}
        ${config.show_kpis !== false ? this._renderKpis(flows, ctx) : html`<div class="spacer"></div>`}
      </ha-card>
    `;
  }

  private _renderSwitcher(view: string, t: ViewContext["t"]): TemplateResult {
    return html`<div class="switcher">
      <ha-icon-button
        .path=${mdiHomeOutline}
        .label=${t("label.view_house")}
        ?selected=${view === "house"}
        @click=${() => (this._view = "house")}
      ></ha-icon-button>
      <ha-icon-button
        .path=${mdiVectorPolyline}
        .label=${t("label.view_flow")}
        ?selected=${view === "flow"}
        @click=${() => (this._view = "flow")}
      ></ha-icon-button>
    </div>`;
  }

  /** Indoor appliances (water heater, heating rods) shown as chips below the house. */
  private _renderChips(ctx: ViewContext): TemplateResult | typeof nothing {
    const inner = ctx.devices.filter((d) => (d.kind === "water_heater" || d.kind === "heating_rod") && d.visible);
    if (!inner.length) return nothing;
    return html`<div class="chips">
      ${inner.map(
        (d) => html`<button
          class="chip ${d.active ? "on" : ""}"
          style=${styleMap({ "--chip-color": d.color })}
          @click=${() => this._moreInfo(d.entity)}
        >
          <ha-svg-icon .path=${d.icon}></ha-svg-icon>
          ${d.name} ${d.active ? html`<b>${ctx.power(d.power).join(" ")}</b>` : nothing}
          <span class="state">${d.active ? ctx.t("label.active") : ctx.t("label.off")}</span>
        </button>`,
      )}
    </div>`;
  }

  private _renderConsumption(flows: Flows, devices: DeviceState[], ctx: ViewContext): TemplateResult | typeof nothing {
    const consumers = this._config?.consumers ?? [];
    if (!consumers.length && !devices.length) return nothing;
    const hass = this.hass!;
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
    if (untracked > 0) items.push({ name: ctx.t("label.untracked"), color: UNTRACKED_COLOR, power: untracked });
    const n0 = numberFormatter(hass);
    const n1 = numberFormatter(hass, 1);

    return html`<div class="consumption">
      <div class="consumption-row">
        <div class="total">${n0(total)}<small>W</small></div>
        <div class="bar">
          ${items.map((i) => {
            const pct = total > 0 ? (i.power / total) * 100 : 0;
            const text = pct >= 22 && i.entity ? ctx.power(i.power).join(" ") : pct >= 7 ? `${Math.round(pct)}%` : "";
            return html`<div
              class="segment ${needsDarkText(i.color) ? "dark" : ""}"
              style=${styleMap({ flexGrow: String(i.power), background: i.color })}
              title="${i.name}: ${n0(i.power)} W (${n1(pct)} %)"
              @click=${() => this._moreInfo(i.entity)}
            >
              <span>${text}</span>
            </div>`;
          })}
        </div>
      </div>
      <div class="legend">
        ${items.map(
          (i) => html`<button @click=${() => this._moreInfo(i.entity)} ?disabled=${!i.entity}>
            <i style=${styleMap({ background: i.color })}></i>${i.name}${i.entity ? ` · ${ctx.power(i.power).join(" ")}` : ""}
          </button>`,
        )}
      </div>
    </div>`;
  }

  private _renderKpis(f: Flows, ctx: ViewContext): TemplateResult {
    const hass = this.hass!;
    const pct = (v: number) => `${Math.round(v * 100)} %`;
    const today = readNumber(hass, this._config!.entities.pv_energy_today);
    const todayUnit = this._config!.entities.pv_energy_today
      ? hass.states[this._config!.entities.pv_energy_today]?.attributes.unit_of_measurement ?? "kWh"
      : "kWh";
    return html`<div class="kpis">
      <div class="kpi"><b>${f.home > 0 ? pct((f.home - f.gridHome) / f.home) : "–"}</b><span>${ctx.t("label.autarky")}</span></div>
      <div class="kpi">
        <b>${f.pv > 0 ? pct((f.pv - f.pvGrid) / f.pv) : "–"}</b><span>${ctx.t("label.self_consumption")}</span>
      </div>
      ${today !== undefined
        ? html`<div class="kpi">
            <b>${numberFormatter(hass, 1)(today)} ${todayUnit}</b><span>${ctx.t("label.pv_today")}</span>
          </div>`
        : nothing}
    </div>`;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TYPE,
  name: "Very Custom Energy House Card",
  description: localizer()("card.description"),
  preview: true,
  documentationURL: "https://github.com/Pfillip/very-custom-energy-house-card",
});
