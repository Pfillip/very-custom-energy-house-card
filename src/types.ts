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

export type HouseStyle = "classic" | "terraced";

export interface ConsumerConfig {
  entity: string;
  name?: string;
  color?: string;
}

export interface DeviceConfig {
  entity?: string;
  name?: string;
  /** hex color used for the cable, flow node, chip and bar segment */
  color?: string;
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
  /** @deprecated use kpis.pv_today.entity */
  pv_energy_today?: string;
}

export interface LightingConfig {
  /** light, switch or input_boolean that switches the outdoor lighting */
  entity?: string;
  /** optional power sensor; adds the lighting to the consumption bar */
  power?: string;
  name?: string;
  color?: string;
  /**
   * indoor lighting only: optional brightness entity (number, input_number or sensor,
   * 0–100 % or 0–255). Without it a light's own brightness attribute is used.
   */
  brightness?: string;
}

export interface DevicesConfig {
  wallbox?: DeviceConfig;
  heat_pump?: DeviceConfig;
  air_conditioner?: DeviceConfig;
  /** hot tub; in the terraced motif it appears in the back garden while it is running */
  jacuzzi?: DeviceConfig;
  water_heater?: HidableDeviceConfig;
  heating_rods?: HeatingRodsConfig;
  /** front garden: wall light above the door and bollards along the walkway */
  lighting?: LightingConfig;
  /** back garden behind the house */
  garden_lighting?: LightingConfig;
  /** lights inside the house: windows glow while it is on */
  indoor_lighting?: LightingConfig;
}

/** One key figure. Without an entity, autarky and self-consumption are calculated live. */
export interface KpiConfig {
  entity?: string;
  name?: string;
}

export interface KpisConfig {
  autarky?: KpiConfig;
  self_consumption?: KpiConfig;
  pv_today?: KpiConfig;
}

export interface CardConfig {
  type: string;
  title?: string;
  view?: ViewMode;
  /** house motif of the house view */
  house_style?: HouseStyle;
  entities: SourcesConfig;
  devices?: DevicesConfig;
  consumers?: ConsumerConfig[];
  kpis?: KpisConfig;
  show_consumers?: boolean;
  show_kpis?: boolean;
  /** bar card: show lighting and appliance chips above the bar */
  show_chips?: boolean;
  animation?: boolean;
  active_threshold?: number;
  /** color of the "Untracked" segment */
  untracked_color?: string;
  /** font weight of the total next to the consumption bar */
  total_font_weight?: FontWeight;
}

export type FontWeight = "light" | "regular" | "medium" | "bold";

export type DeviceKind = "wallbox" | "heat_pump" | "air_conditioner" | "jacuzzi" | "water_heater" | "heating_rod" | "lighting" | "garden_lighting" | "indoor_lighting";

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

export interface LightingState {
  kind: "lighting" | "garden_lighting" | "indoor_lighting";
  color: string;
  entity: string;
  name: string;
  on: boolean;
  /** 0…1 while on; 1 when no brightness is known */
  brightness: number;
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
