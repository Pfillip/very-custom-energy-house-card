// Minimal subset of the Home Assistant frontend types used by this card.
// (custom-card-helpers is unmaintained, so the needed shapes are declared here.)

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language: string;
  locale?: { language: string; number_format?: string };
  themes?: { darkMode?: boolean };
}

export type ViewMode = "house" | "flow" | "switch";

export interface ConsumerConfig {
  entity: string;
  name?: string;
  color?: string;
}

export interface DeviceConfig {
  entity?: string;
  name?: string;
}

export interface HidableDeviceConfig extends DeviceConfig {
  hide_inactive?: boolean;
}

export interface HeatingRodsConfig {
  hide_inactive?: boolean;
  entities?: ConsumerConfig[];
}

export interface SourcesConfig {
  pv?: string;
  grid?: string;
  grid_invert?: boolean;
  battery?: string;
  battery_invert?: boolean;
  battery_soc?: string;
  home?: string;
  pv_energy_today?: string;
}

export interface DevicesConfig {
  wallbox?: DeviceConfig;
  heat_pump?: DeviceConfig;
  water_heater?: HidableDeviceConfig;
  heating_rods?: HeatingRodsConfig;
}

export interface CardConfig {
  type: string;
  title?: string;
  view?: ViewMode;
  entities: SourcesConfig;
  devices?: DevicesConfig;
  consumers?: ConsumerConfig[];
  show_consumers?: boolean;
  show_kpis?: boolean;
  animation?: boolean;
  active_threshold?: number;
}

export type DeviceKind = "wallbox" | "heat_pump" | "water_heater" | "heating_rod";

export interface DeviceState {
  kind: DeviceKind;
  entity: string;
  name: string;
  color: string;
  icon: string;
  power: number;
  active: boolean;
  /** false when the device is configured to hide while inactive and is currently inactive */
  visible: boolean;
}

export interface Flows {
  pv: number;
  home: number;
  gridImport: number;
  gridExport: number;
  charge: number;
  discharge: number;
  pvHome: number;
  pvBat: number;
  pvGrid: number;
  batHome: number;
  gridHome: number;
  gridBat: number;
}
