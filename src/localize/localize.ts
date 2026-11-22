import de from "./languages/de.json";
import en from "./languages/en.json";
import type { HomeAssistant } from "../types";

const LANGUAGES: Record<string, unknown> = { de, en };

export type Localizer = (key: string, vars?: Record<string, string>) => string;

function lookup(dict: unknown, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((obj, part) => (obj as Record<string, unknown>)?.[part], dict);
  return typeof value === "string" ? value : undefined;
}

export function languageOf(hass?: HomeAssistant): string {
  return (hass?.locale?.language ?? hass?.language ?? "en").split("-")[0];
}

export function localizer(hass?: HomeAssistant): Localizer {
  const lang = languageOf(hass);
  return (key, vars) => {
    let text = lookup(LANGUAGES[lang], key) ?? lookup(en, key) ?? key;
    for (const [name, value] of Object.entries(vars ?? {})) text = text.replace(`{${name}}`, value);
    return text;
  };
}
