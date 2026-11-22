import { mdiHomeOutline, mdiVectorPolyline } from "@mdi/js";
import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { CARD_TYPE, CARD_VERSION, EDITOR_TYPE } from "./const";
import "./editor";
import { localizer } from "./localize/localize";
import { buildContext, configChanged, renderChips, renderConsumption, renderKpis, renderWarnings } from "./parts";
import { stubConfig } from "./stub";
import { cardStyles } from "./styles";
import type { CardConfig, HomeAssistant } from "./types";
import type { ViewContext } from "./views/context";
import { renderFlow } from "./views/flow";
import { renderHouse } from "./views/house";
import { renderTerraced } from "./views/terraced";

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
    return { view: "switch", ...stubConfig(hass) };
  }

  public setConfig(config: CardConfig): void {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    if (config.house_style && !["classic", "terraced"].includes(config.house_style)) {
      throw new Error(`Unknown house_style "${config.house_style}" (use classic or terraced)`);
    }
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

  /**
   * Sections layout: full width by default, at least half a section wide.
   * Leaving out `rows` keeps automatic height; a fixed height set in the layout tab
   * is honoured because the house/flow drawing shrinks or grows to fill it.
   */
  public getGridOptions() {
    return { columns: 12, min_columns: 6, min_rows: 5 };
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (changed.has("_config") || changed.has("_view")) return true;
    if (!changed.has("hass")) return false;
    return configChanged(this._config, changed.get("hass") as HomeAssistant | undefined, this.hass);
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
    const ctx = buildContext(this.hass, config, this._moreInfo);
    const view = config.view === "house" || config.view === "flow" ? config.view : this._view;
    const switchable = config.view === "switch" || !config.view;

    return html`
      <ha-card
        class=${config.animation === false ? "static" : ""}
        style=${config.label_scale ? `--vce-label-scale:${config.label_scale / 100}` : ""}
      >
        ${config.title || switchable
          ? html`<div class="header">
              ${config.title ? html`<h1>${config.title}</h1>` : nothing}
              ${switchable ? this._renderSwitcher(view, ctx.t) : nothing}
            </div>`
          : nothing}
        ${renderWarnings(ctx)}
        <div class="body">
          <div class="scene-wrap">
            ${view === "flow"
              ? renderFlow(ctx, this._uid)
              : config.house_style === "terraced"
                ? renderTerraced(ctx, this._uid)
                : renderHouse(ctx, this._uid)}
          </div>
          <div class="side">
            ${view === "house" ? renderChips(ctx) : nothing}
            ${config.show_consumers !== false ? renderConsumption(ctx) : nothing}
            ${config.show_kpis !== false ? renderKpis(ctx) : html`<div class="spacer"></div>`}
          </div>
        </div>
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
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TYPE,
  name: "Very Custom Energy House Card",
  description: localizer()("card.description"),
  preview: true,
  documentationURL: "https://github.com/Pfillip/very-custom-energy-house-card",
});
