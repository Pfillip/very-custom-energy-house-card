import { mdiAirConditioner, mdiEvStation, mdiOutdoorLamp, mdiHeatingCoil, mdiHeatPump, mdiWaterBoiler } from "@mdi/js";
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
  ) => {
    if (!entity) return;
    const power = Math.max(0, readPower(hass, entity) ?? 0);
    const active = power >= threshold;
    list.push({ kind, entity, name, icon, color: DEVICE_COLORS[kind], power, active, visible: active || !hideInactive });
  };

  add("wallbox", d.wallbox?.entity, d.wallbox?.name || t("label.wallbox"), mdiEvStation);
  add("heat_pump", d.heat_pump?.entity, d.heat_pump?.name || t("label.heat_pump"), mdiHeatPump);
  add(
    "air_conditioner",
    d.air_conditioner?.entity,
    d.air_conditioner?.name || t("label.air_conditioner"),
    mdiAirConditioner,
  );
  add(
    "water_heater",
    d.water_heater?.entity,
    d.water_heater?.name || t("label.water_heater"),
    mdiWaterBoiler,
    d.water_heater?.hide_inactive,
  );
  (d.heating_rods?.entities ?? []).forEach((rod, i) =>
    add(
      "heating_rod",
      rod.entity,
      rod.name || `${t("label.heating_rod")} ${i + 1}`,
      mdiHeatingCoil,
      d.heating_rods?.hide_inactive,
    ),
  );
  // Outdoor lighting only shows up as a consumer when it has a power sensor.
  if (d.lighting?.entity) {
    add("lighting", d.lighting.power, d.lighting.name || t("label.lighting"), mdiOutdoorLamp);
  }
  return list;
}

/** Outdoor lighting switch state; undefined when not configured. */
export function lightingState(hass: HomeAssistant, config: CardConfig, t: Localizer): LightingState | undefined {
  const l = config.devices?.lighting;
  if (!l?.entity) return undefined;
  return { entity: l.entity, name: l.name || t("label.lighting"), on: hass.states[l.entity]?.state === "on" };
}

export function consumerColor(index: number, color?: string): string {
  return color || CONSUMER_PALETTE[index % CONSUMER_PALETTE.length];
}

/** True when white text is hard to read on the given hex background. */
export function needsDarkText(hex: string): boolean {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return false;
  const [r, g, b] = m.slice(1).map((x) => Number.parseInt(x, 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6;
}
