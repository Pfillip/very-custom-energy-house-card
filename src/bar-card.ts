import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { BAR_CARD_TYPE, BAR_EDITOR_TYPE } from "./const";
import { localizer } from "./localize/localize";
import { buildContext, configChanged, renderChips, renderConsumption, renderKpis, renderWarnings } from "./parts";
import { stubConfig } from "./stub";
import { cardStyles } from "./styles";
import type { CardConfig, HomeAssistant } from "./types";

/**
 * Consumption bar on its own: total, stacked bar and legend, optionally the key figures
 * and the chips. Uses the same configuration as the house card, so a config can be
 * copied from one to the other.
 */
@customElement(BAR_CARD_TYPE)
export class VeryCustomEnergyBarCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: CardConfig;

  static styles = [
    cardStyles,
    css`
      .bar-body {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        padding-top: 12px;
      }
      .header + .bar-body,
      .warning + .bar-body {
        padding-top: 4px;
      }
      .bar-body .chips {
        padding-top: 0;
      }
      .empty {
        padding: 16px;
        color: var(--secondary-text-color);
      }
    `,
  ];

  public static getConfigElement(): HTMLElement {
    return document.createElement(BAR_EDITOR_TYPE);
  }

  public static getStubConfig(hass: HomeAssistant): Partial<CardConfig> {
    return stubConfig(hass);
  }

  public setConfig(config: CardConfig): void {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    if (config.consumers && !Array.isArray(config.consumers)) throw new Error("consumers must be a list");
    this._config = { ...config, entities: { ...(config.entities ?? {}) } };
  }

  public getCardSize(): number {
    return 2 + (this._config?.show_kpis !== false ? 1 : 0) + (this._config?.show_chips ? 1 : 0);
  }

  public getGridOptions() {
    return { columns: 12, min_columns: 4, min_rows: 2 };
  }

  protected shouldUpdate(changed: PropertyValues): boolean {
    if (changed.has("_config")) return true;
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
    const consumption = renderConsumption(ctx);
    return html`
      <ha-card>
        ${config.title ? html`<div class="header"><h1>${config.title}</h1></div>` : nothing}
        ${renderWarnings(ctx)}
        <div class="bar-body">
          ${config.show_chips ? renderChips(ctx) : nothing}
          ${consumption === nothing ? html`<div class="empty">${ctx.t("label.no_consumers")}</div>` : consumption}
          ${config.show_kpis !== false ? renderKpis(ctx) : html`<div class="spacer"></div>`}
        </div>
      </ha-card>
    `;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: BAR_CARD_TYPE,
  name: "Very Custom Energy Bar Card",
  description: localizer()("card.bar_description"),
  preview: true,
  documentationURL: "https://github.com/Pfillip/very-custom-energy-house-card#bar-card",
});
