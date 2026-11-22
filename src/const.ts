import pkg from "../package.json";

export const CARD_TYPE = "very-custom-energy-house-card";
export const EDITOR_TYPE = `${CARD_TYPE}-editor`;
export const CARD_VERSION: string = pkg.version;

/** Power (W) from which a device counts as active and a flow is drawn. */
export const DEFAULT_ACTIVE_THRESHOLD = 10;

export const CONSUMER_PALETTE = [
  "#4b5fc6",
  "#f0b429",
  "#f2765a",
  "#4aa58e",
  "#9a5cf0",
  "#c9792e",
  "#9eb0e0",
  "#e57399",
  "#5bb5c4",
  "#8d9b3a",
];

export const DEVICE_COLORS = {
  wallbox: "#66bb6a",
  heat_pump: "#ef5350",
  air_conditioner: "#ab47bc",
  water_heater: "#26c6da",
  heating_rod: "#d84315",
  lighting: "#f5b941",
  garden_lighting: "#d4e157",
  indoor_lighting: "#ffca28",
} as const;

export const UNTRACKED_COLOR = "#3fa3e8";
