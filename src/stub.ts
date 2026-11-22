import type { CardConfig, HomeAssistant } from "./types";

/** Best-effort guess of the energy sensors for a new card in the card picker. */
export function stubConfig(hass: HomeAssistant): Partial<CardConfig> {
  const power = Object.values(hass.states).filter(
    (s) => s.entity_id.startsWith("sensor.") && s.attributes.device_class === "power",
  );
  const find = (re: RegExp) => power.find((s) => re.test(s.entity_id))?.entity_id;
  const soc = Object.values(hass.states).find(
    (s) => s.attributes.device_class === "battery" && /batter|akku|storage|speicher/i.test(s.entity_id),
  );
  return {
    entities: {
      pv: find(/pv|solar/i),
      grid: find(/grid|netz/i),
      battery: find(/batter|akku|storage|speicher/i),
      battery_soc: soc?.entity_id,
    },
    consumers: [],
  };
}
