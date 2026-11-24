import { mdiAirConditioner, mdiEvStation, mdiHotTub, mdiLightbulbOutline, mdiOutdoorLamp, mdiHeatingCoil, mdiHeatPump, mdiWaterBoiler } from "@mdi/js";
import { CONSUMER_PALETTE, DEFAULT_ACTIVE_THRESHOLD, DEVICE_COLORS } from "./const";
import type { Localizer } from "./localize/localize";
import type { CardConfig, DeviceState, Flows, HomeAssistant, LightingState } from "./types";

const UNIT_FACTORS: Record<string, number> = { mw: 1_000_000, kw: 1000, w: 1 };

/** Reads a power sensor and normalises it to watts. Returns undefined if unavailable. */
export function readPower(hass: HomeAssistant, entityId?: string): number | undefined {
  const value = readNumber(hass, entityId);
  if (value === undefined || !entityId) return undefined;
  const unit = String(hass.states[entityId].attributes.unit_of_measurement ?? "W").toLowerCase();
  return value * (UNIT_FACTORS[unit] ?? 1);
}

export function readNumber(hass: HomeAssistant, entityId?: string): number | undefined {
  if (!entityId) return undefined;
  const stateObj = hass.states[entityId];
  if (!stateObj) return undefined;
  const value = Number.parseFloat(stateObj.state);
  return Number.isFinite(value) ? value : undefined;
}

export interface SourceValues {
  pv?: number;
  /** + import, − export */
  grid?: number;
  /** + discharge, − charge */
  battery?: number;
  home?: number;
}

/**
 * Splits the measured values into the six possible flows.
 * Priority: solar covers the house first, then charges the battery, the rest is exported.
 */
export function computeFlows(v: SourceValues): Flows {
  const pv = Math.max(0, v.pv ?? 0);
  const bat = v.battery ?? 0;
  const charge = Math.max(0, -bat);
  const discharge = Math.max(0, bat);
  const home = Math.max(0, v.home ?? pv + (v.grid ?? 0) + bat);

  const pvHome = Math.min(pv, home);
  const pvBat = Math.min(pv - pvHome, charge);
  const pvGrid = Math.max(0, pv - pvHome - pvBat);
  const batHome = Math.min(discharge, home - pvHome);
  const gridHome = Math.max(0, home - pvHome - batHome);
  const gridBat = Math.max(0, charge - pvBat);

  const gridImport = v.grid !== undefined ? Math.max(0, v.grid) : gridHome + gridBat;
  const gridExport = v.grid !== undefined ? Math.max(0, -v.grid) : pvGrid;

  return { pv, home, gridImport, gridExport, charge, discharge, pvHome, pvBat, pvGrid, batHome, gridHome, gridBat };
}

export function sourceValues(hass: HomeAssistant, config: CardConfig): SourceValues {
  const e = config.entities;
  const grid = readPower(hass, e.grid);
  const battery = readPower(hass, e.battery);
  return {
    pv: readPower(hass, e.pv),
    grid: grid === undefined ? undefined : e.grid_invert ? -grid : grid,
    battery: battery === undefined ? undefined : e.battery_invert ? -battery : battery,
    home: readPower(hass, e.home),
  };
}

export function activeThreshold(config: CardConfig): number {
  return config.active_threshold ?? DEFAULT_ACTIVE_THRESHOLD;
}

/** All configured large appliances. Unconfigured devices are not returned at all. */
export function deviceStates(hass: HomeAssistant, config: CardConfig, t: Localizer): DeviceState[] {
  const d = config.devices ?? {};
  const threshold = activeThreshold(config);
  const list: DeviceState[] = [];
  const add = (
    kind: DeviceState["kind"],
    entity: string | undefined,
    name: string,
    icon: string,
    hideInactive = false,
    color?: string,
  ) => {
    if (!entity) return;
    const power = Math.max(0, readPower(hass, entity) ?? 0);
    const active = power >= threshold;
    list.push({ kind, entity, name, icon, color: safeColor(color, DEVICE_COLORS[kind]), power, active, visible: active || !hideInactive });
  };

  add("wallbox", d.wallbox?.entity, d.wallbox?.name || t("label.wallbox"), mdiEvStation, false, d.wallbox?.color);
  add("heat_pump", d.heat_pump?.entity, d.heat_pump?.name || t("label.heat_pump"), mdiHeatPump, false, d.heat_pump?.color);
  add(
    "air_conditioner",
    d.air_conditioner?.entity,
    d.air_conditioner?.name || t("label.air_conditioner"),
    mdiAirConditioner,
    false,
    d.air_conditioner?.color,
  );
  add("jacuzzi", d.jacuzzi?.entity, d.jacuzzi?.name || t("label.jacuzzi"), mdiHotTub, false, d.jacuzzi?.color);
  add(
    "water_heater",
    d.water_heater?.entity,
    d.water_heater?.name || t("label.water_heater"),
    mdiWaterBoiler,
    d.water_heater?.hide_inactive,
    d.water_heater?.color,
  );
  (d.heating_rods?.entities ?? []).forEach((rod, i) =>
    add(
      "heating_rod",
      rod.entity,
      rod.name || `${t("label.heating_rod")} ${i + 1}`,
      mdiHeatingCoil,
      d.heating_rods?.hide_inactive,
      rod.color,
    ),
  );
  // Outdoor lighting only shows up as a consumer when it has a power sensor.
  for (const kind of ["lighting", "garden_lighting", "indoor_lighting"] as const) {
    const l = d[kind];
    const icon = kind === "indoor_lighting" ? mdiLightbulbOutline : mdiOutdoorLamp;
    if (l?.entity) add(kind, l.power, l.name || t(`label.${kind}`), icon, false, l.color);
  }
  return list;
}

/**
 * Brightness 0…1 of a lighting group: a separate brightness entity wins (0–100 % or 0–255,
 * or relative to an input_number's max), otherwise a light's own brightness attribute.
 */
export function lightBrightness(hass: HomeAssistant, entity: string, brightnessEntity?: string): number {
  if (brightnessEntity) {
    const value = readNumber(hass, brightnessEntity);
    if (value !== undefined) {
      const attrs = hass.states[brightnessEntity].attributes;
      const max = Number(attrs.max) || (attrs.unit_of_measurement === "%" || value <= 100 ? 100 : 255);
      return Math.max(0, Math.min(1, value / max));
    }
  }
  const raw = Number(hass.states[entity]?.attributes.brightness);
  return Number.isFinite(raw) && raw > 0 ? Math.min(1, raw / 255) : 1;
}

/** Switch state of a lighting group (front/back garden, indoors); undefined when not configured. */
export function lightingState(
  hass: HomeAssistant,
  config: CardConfig,
  t: Localizer,
  kind: LightingState["kind"],
): LightingState | undefined {
  const l = config.devices?.[kind];
  if (!l?.entity) return undefined;
  return {
    kind,
    color: safeColor(l.color, DEVICE_COLORS[kind]),
    entity: l.entity,
    name: l.name || t(`label.${kind}`),
    on: hass.states[l.entity]?.state === "on",
    brightness: lightBrightness(hass, l.entity, l.brightness),
  };
}

/**
 * Colours from the card configuration are user input (YAML can hold anything), so only plain
 * colour values pass: hex (#rgb, #rgba, #rrggbb, #rrggbbaa), a CSS colour name made of letters,
 * or rgb()/rgba()/hsl()/hsla() with numbers. Anything else falls back to the default colour.
 */
const SAFE_COLOR = /^(#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|[a-z]{3,30}|(rgb|hsl)a?\(\s*[\d.%]+(\s*[,\s/]\s*[\d.%]+){2,3}\s*\))$/i;

export function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && SAFE_COLOR.test(value.trim()) ? value.trim() : fallback;
}

export function consumerColor(index: number, color?: string): string {
  return safeColor(color, CONSUMER_PALETTE[index % CONSUMER_PALETTE.length]);
}

/** True when white text is hard to read on the given hex background. */
export function needsDarkText(hex: string): boolean {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return false;
  const [r, g, b] = m.slice(1).map((x) => Number.parseInt(x, 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6;
}
