import { languageOf } from "./localize/localize";
import type { HomeAssistant } from "./types";

export type PowerFormatter = (watts: number) => [value: string, unit: string];

export function powerFormatter(hass: HomeAssistant): PowerFormatter {
  const lang = languageOf(hass);
  const nf0 = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (watts) => {
    const w = Math.abs(watts);
    return w >= 1000 ? [nf1.format(w / 1000), "kW"] : [nf0.format(Math.round(w)), "W"];
  };
}

export function numberFormatter(hass: HomeAssistant, digits = 0): (n: number) => string {
  const nf = new Intl.NumberFormat(languageOf(hass), { maximumFractionDigits: digits });
  return (n) => nf.format(n);
}

/** Seconds a dash or dot needs for one pass: faster with more power. */
export function flowDuration(watts: number): number {
  return Math.max(0.5, 3.2 - watts / 2200);
}
