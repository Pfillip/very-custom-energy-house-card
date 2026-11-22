import { mdiArrowDown, mdiArrowUp, mdiDelete, mdiFormatListBulleted, mdiHeatPump, mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { consumerColor } from "./compute";
import { DEFAULT_ACTIVE_THRESHOLD, DEVICE_COLORS, EDITOR_TYPE } from "./const";
import { localizer, type Localizer } from "./localize/localize";
import type { CardConfig, ConsumerConfig, DevicesConfig, HomeAssistant } from "./types";

type Schema = Record<string, unknown>;
type ListKind = "consumers" | "heating_rods";

const SENSOR = { entity: { filter: { domain: "sensor" } } };

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<{ createCardElement: (c: unknown) => HTMLElement }>;
  }
}

/** HA lazy-loads its form elements; creating a built-in card editor makes sure they exist. */
async function loadHaComponents(): Promise<void> {
  if (customElements.get("ha-form") && customElements.get("ha-entity-picker")) return;
  const helpers = await window.loadCardHelpers?.();
  if (!helpers) return;
  const card = helpers.createCardElement({ type: "entities", entities: [] }) as unknown as {
    constructor: { getConfigElement?: () => Promise<unknown> };
  };
  await card.constructor.getConfigElement?.();
}

const hexToRgb = (hex?: string): number[] | undefined => {
  const m = hex && /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  return m ? m.slice(1).map((x) => Number.parseInt(x, 16)) : undefined;
};
const rgbToHex = (rgb?: number[]): string | undefined =>
  Array.isArray(rgb) && rgb.length === 3 ? `#${rgb.map((n) => n.toString(16).padStart(2, "0")).join("")}` : undefined;

/** Drops undefined, empty strings, empty objects and empty lists so the YAML stays tidy. */
function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const c = clean(v);
      const empty =
        c === undefined ||
        c === "" ||
        (c && typeof c === "object" && !Array.isArray(c) && Object.keys(c).length === 0);
      if (!empty) out[k] = c;
    }
    return out as T;
  }
  return value;
}

@customElement(EDITOR_TYPE)
export class VeryCustomEnergyHouseCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: CardConfig;

  public setConfig(config: CardConfig): void {
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    loadHaComponents().then(() => this.requestUpdate());
  }

  private get _t(): Localizer {
    return localizer(this.hass);
  }

  private _label = (schema: Schema): string => this._t(`editor.${schema.name as string}`);

  /** The constant row of the key-figure form shows the helper text as its label. */
  private _kpiLabel = (schema: Schema): string =>
    schema.name === "kpis_helper" ? this._t("editor.kpis_helper") : this._label(schema);

  private _helper = (schema: Schema): string | undefined =>
    schema.name === "home" ? this._t("editor.home_helper") : undefined;

  // ---------- schemas ----------

  private _mainSchema(): Schema[] {
    const t = this._t;
    return [
      { name: "title", selector: { text: {} } },
      {
        name: "view",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "switch", label: t("editor.view_switch") },
              { value: "house", label: t("editor.view_house") },
              { value: "flow", label: t("editor.view_flow") },
            ],
          },
        },
      },
      {
        type: "expandable",
        name: "entities",
        title: t("editor.sources"),
        icon: "mdi:solar-power-variant",
        expanded: true,
        schema: [
          { name: "pv", selector: SENSOR },
          // Sensor and its sign switch stacked: side by side the entity names get truncated.
          { name: "grid", selector: SENSOR },
          { name: "grid_invert", selector: { boolean: {} } },
          { name: "battery", selector: SENSOR },
          { name: "battery_invert", selector: { boolean: {} } },
          { name: "battery_soc", selector: SENSOR },
          { name: "home", selector: SENSOR },
        ],
      },
    ];
  }

  private _devicesSchema(): Schema[] {
    return [
      {
        type: "grid",
        name: "",
        schema: [
          { name: "wallbox", selector: SENSOR },
          { name: "wallbox_name", selector: { text: {} } },
          { name: "heat_pump", selector: SENSOR },
          { name: "heat_pump_name", selector: { text: {} } },
          { name: "air_conditioner", selector: SENSOR },
          { name: "air_conditioner_name", selector: { text: {} } },
          { name: "water_heater", selector: SENSOR },
          { name: "water_heater_name", selector: { text: {} } },
          { name: "lighting", selector: { entity: { filter: { domain: ["light", "switch", "input_boolean"] } } } },
          { name: "lighting_name", selector: { text: {} } },
          { name: "lighting_power", selector: SENSOR },
        ],
      },
      { name: "water_heater_hide_inactive", selector: { boolean: {} } },
    ];
  }

  private _kpiSchema(): Schema[] {
    const t = this._t;
    const pair = (key: string) => ({
      type: "grid",
      name: "",
      schema: [
        { name: `${key}_entity`, selector: SENSOR },
        { name: `${key}_name`, selector: { text: {} } },
      ],
    });
    return [
      {
        type: "expandable",
        name: "",
        flatten: true,
        title: t("editor.kpis"),
        icon: "mdi:chart-donut",
        schema: [
          { type: "constant", name: "kpis_helper", value: "" },
          pair("autarky"),
          pair("self_consumption"),
          pair("pv_today"),
        ],
      },
    ];
  }

  private _displaySchema(): Schema[] {
    return [
      {
        type: "expandable",
        name: "",
        flatten: true,
        title: this._t("editor.display"),
        icon: "mdi:palette-outline",
        schema: [
          { name: "show_consumers", selector: { boolean: {} } },
          { name: "show_kpis", selector: { boolean: {} } },
          { name: "animation", selector: { boolean: {} } },
          {
            name: "active_threshold",
            selector: { number: { min: 0, max: 5000, step: 1, mode: "box", unit_of_measurement: "W" } },
          },
        ],
      },
    ];
  }

  private _rowSchema(withColor: boolean): Schema[] {
    return [
      {
        type: "grid",
        name: "",
        schema: [
          { name: "entity", required: true, selector: SENSOR },
          { name: "name", selector: { text: {} } },
        ],
      },
      ...(withColor ? [{ name: "color", selector: { color_rgb: {} } }] : []),
    ];
  }

  // ---------- render ----------

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    const c = this._config;
    const t = this._t;
    const d = c.devices ?? {};

    const mainData = { title: c.title, view: c.view ?? "switch", entities: c.entities ?? {} };
    const deviceData = {
      wallbox: d.wallbox?.entity,
      wallbox_name: d.wallbox?.name,
      heat_pump: d.heat_pump?.entity,
      heat_pump_name: d.heat_pump?.name,
      air_conditioner: d.air_conditioner?.entity,
      air_conditioner_name: d.air_conditioner?.name,
      water_heater: d.water_heater?.entity,
      water_heater_name: d.water_heater?.name,
      water_heater_hide_inactive: d.water_heater?.hide_inactive ?? false,
      lighting: d.lighting?.entity,
      lighting_name: d.lighting?.name,
      lighting_power: d.lighting?.power,
    };
    const k = c.kpis ?? {};
    const kpiData = {
      autarky_entity: k.autarky?.entity,
      autarky_name: k.autarky?.name,
      self_consumption_entity: k.self_consumption?.entity,
      self_consumption_name: k.self_consumption?.name,
      pv_today_entity: k.pv_today?.entity ?? c.entities?.pv_energy_today,
      pv_today_name: k.pv_today?.name,
    };
    const displayData = {
      show_consumers: c.show_consumers ?? true,
      show_kpis: c.show_kpis ?? true,
      animation: c.animation ?? true,
      active_threshold: c.active_threshold ?? DEFAULT_ACTIVE_THRESHOLD,
    };

    return html`
      <div class="editor">
        <ha-form
          .hass=${this.hass}
          .data=${mainData}
          .schema=${this._mainSchema()}
          .computeLabel=${this._label}
          .computeHelper=${this._helper}
          @value-changed=${this._mainChanged}
        ></ha-form>

        <ha-expansion-panel outlined .header=${t("editor.devices")}>
          <ha-svg-icon slot="leading-icon" .path=${mdiHeatPump}></ha-svg-icon>
          <div class="panel">
            <p class="hint">${t("editor.devices_helper")}</p>
            <ha-form
              .hass=${this.hass}
              .data=${deviceData}
              .schema=${this._devicesSchema()}
              .computeLabel=${this._label}
              @value-changed=${this._devicesChanged}
            ></ha-form>
            <h4>${t("editor.heating_rods")}</h4>
            ${this._renderList("heating_rods", d.heating_rods?.entities ?? [], false)}
            <ha-form
              .hass=${this.hass}
              .data=${{ heating_rods_hide_inactive: d.heating_rods?.hide_inactive ?? false }}
              .schema=${[{ name: "heating_rods_hide_inactive", selector: { boolean: {} } }]}
              .computeLabel=${this._label}
              @value-changed=${this._rodsHideChanged}
            ></ha-form>
          </div>
        </ha-expansion-panel>

        <ha-expansion-panel outlined .header=${t("editor.consumers")}>
          <ha-svg-icon slot="leading-icon" .path=${mdiFormatListBulleted}></ha-svg-icon>
          <div class="panel">
            <p class="hint">${t("editor.consumers_helper")}</p>
            ${this._renderList("consumers", c.consumers ?? [], true)}
          </div>
        </ha-expansion-panel>

        <ha-form
          .hass=${this.hass}
          .data=${kpiData}
          .schema=${this._kpiSchema()}
          .computeLabel=${this._kpiLabel}
          @value-changed=${this._kpisChanged}
        ></ha-form>

        <ha-form
          .hass=${this.hass}
          .data=${displayData}
          .schema=${this._displaySchema()}
          .computeLabel=${this._label}
          @value-changed=${this._displayChanged}
        ></ha-form>
      </div>
    `;
  }

  private _renderList(kind: ListKind, rows: ConsumerConfig[], withColor: boolean): TemplateResult {
    const t = this._t;
    const schema = this._rowSchema(withColor);
    return html`
      <div class="rows">
        ${rows.map(
          (row, i) => html`<div class="row">
            <span
              class="swatch"
              style="background:${kind === "consumers" ? consumerColor(i, row.color) : DEVICE_COLORS.heating_rod}"
            ></span>
            <ha-form
              .hass=${this.hass}
              .data=${{ entity: row.entity, name: row.name, color: hexToRgb(row.color) }}
              .schema=${schema}
              .computeLabel=${this._label}
              @value-changed=${(ev: CustomEvent) => this._rowChanged(kind, i, ev.detail.value)}
            ></ha-form>
            <div class="actions">
              <ha-icon-button
                .path=${mdiArrowUp}
                .label=${t("editor.move_up")}
                .disabled=${i === 0}
                @click=${() => this._moveRow(kind, i, -1)}
              ></ha-icon-button>
              <ha-icon-button
                .path=${mdiArrowDown}
                .label=${t("editor.move_down")}
                .disabled=${i === rows.length - 1}
                @click=${() => this._moveRow(kind, i, 1)}
              ></ha-icon-button>
              <ha-icon-button
                .path=${mdiDelete}
                .label=${t("editor.remove")}
                @click=${() => this._removeRow(kind, i)}
              ></ha-icon-button>
            </div>
          </div>`,
        )}
      </div>
      <button class="add" @click=${() => this._addRow(kind)}>
        <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
        ${kind === "consumers" ? t("editor.add_consumer") : t("editor.add_heating_rod")}
      </button>
    `;
  }

  // ---------- change handling ----------

  private _update(patch: Partial<CardConfig>): void {
    if (!this._config) return;
    this._config = clean({ ...this._config, ...patch });
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }),
    );
  }

  private _mainChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const v = ev.detail.value;
    this._update({ title: v.title, view: v.view, entities: v.entities ?? {} });
  }

  private _devicesChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const v = ev.detail.value;
    const d: DevicesConfig = { ...(this._config?.devices ?? {}) };
    d.wallbox = v.wallbox ? { entity: v.wallbox, name: v.wallbox_name } : undefined;
    d.heat_pump = v.heat_pump ? { entity: v.heat_pump, name: v.heat_pump_name } : undefined;
    d.air_conditioner = v.air_conditioner
      ? { entity: v.air_conditioner, name: v.air_conditioner_name }
      : undefined;
    d.water_heater = v.water_heater
      ? { entity: v.water_heater, name: v.water_heater_name, hide_inactive: v.water_heater_hide_inactive || undefined }
      : undefined;
    d.lighting = v.lighting
      ? { entity: v.lighting, name: v.lighting_name, power: v.lighting_power }
      : undefined;
    this._update({ devices: d });
  }

  private _kpisChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const v = ev.detail.value;
    const slot = (key: string) => ({ entity: v[`${key}_entity`], name: v[`${key}_name`] });
    // pv_energy_today moved to kpis.pv_today.entity
    const entities = { ...(this._config?.entities ?? {}) };
    delete entities.pv_energy_today;
    this._update({
      entities,
      kpis: { autarky: slot("autarky"), self_consumption: slot("self_consumption"), pv_today: slot("pv_today") },
    });
  }

  private _rodsHideChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const d = this._config?.devices ?? {};
    this._update({
      devices: {
        ...d,
        heating_rods: { ...d.heating_rods, hide_inactive: ev.detail.value.heating_rods_hide_inactive || undefined },
      },
    });
  }

  private _displayChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const v = ev.detail.value;
    this._update({
      show_consumers: v.show_consumers === false ? false : undefined,
      show_kpis: v.show_kpis === false ? false : undefined,
      animation: v.animation === false ? false : undefined,
      active_threshold: v.active_threshold === DEFAULT_ACTIVE_THRESHOLD ? undefined : v.active_threshold,
    });
  }

  private _getRows(kind: ListKind): ConsumerConfig[] {
    return kind === "consumers"
      ? [...(this._config?.consumers ?? [])]
      : [...(this._config?.devices?.heating_rods?.entities ?? [])];
  }

  private _setRows(kind: ListKind, rows: ConsumerConfig[]): void {
    if (kind === "consumers") {
      this._update({ consumers: rows });
    } else {
      const d = this._config?.devices ?? {};
      this._update({ devices: { ...d, heating_rods: { ...d.heating_rods, entities: rows } } });
    }
  }

  private _rowChanged(kind: ListKind, index: number, value: Record<string, unknown>): void {
    const rows = this._getRows(kind);
    rows[index] = {
      entity: (value.entity as string) ?? "",
      name: (value.name as string) || undefined,
      color: kind === "consumers" ? rgbToHex(value.color as number[]) : undefined,
    };
    this._setRows(kind, rows);
  }

  private _moveRow(kind: ListKind, index: number, delta: number): void {
    const rows = this._getRows(kind);
    const [row] = rows.splice(index, 1);
    rows.splice(index + delta, 0, row);
    this._setRows(kind, rows);
  }

  private _removeRow(kind: ListKind, index: number): void {
    const rows = this._getRows(kind);
    rows.splice(index, 1);
    this._setRows(kind, rows);
  }

  private _addRow(kind: ListKind): void {
    this._setRows(kind, [...this._getRows(kind), { entity: "" }]);
  }

  static styles = css`
    .editor {
      display: grid;
      gap: 16px;
    }
    .panel {
      display: grid;
      gap: 12px;
      padding: 0 12px 12px;
    }
    .hint {
      margin: 0;
      font-size: 13px;
      color: var(--secondary-text-color);
    }
    h4 {
      margin: 8px 0 0;
      font-size: 14px;
      font-weight: 500;
    }
    .rows {
      display: grid;
      gap: 8px;
    }
    .row {
      display: grid;
      grid-template-columns: 6px minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
      padding: 8px 4px 8px 0;
      border-bottom: 1px solid var(--divider-color);
    }
    .swatch {
      align-self: stretch;
      border-radius: 3px;
    }
    .actions {
      display: flex;
      flex-direction: column;
      --mdc-icon-button-size: 32px;
      --mdc-icon-size: 18px;
      color: var(--secondary-text-color);
    }
    .add {
      justify-self: start;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font: inherit;
      font-weight: 500;
      color: var(--primary-color);
      background: none;
      border: 1px dashed var(--primary-color);
      border-radius: 8px;
      cursor: pointer;
      --mdc-icon-size: 18px;
    }
    .add:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
  `;
}
