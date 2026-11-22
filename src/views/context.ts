import type { PowerFormatter } from "../format";
import type { Localizer } from "../localize/localize";
import type { CardConfig, DeviceState, Flows, HomeAssistant, LightingState } from "../types";

export interface ViewContext {
  hass: HomeAssistant;
  config: CardConfig;
  flows: Flows;
  soc?: number;
  devices: DeviceState[];
  lighting?: LightingState;
  gardenLighting?: LightingState;
  indoorLighting?: LightingState;
  threshold: number;
  t: Localizer;
  power: PowerFormatter;
  moreInfo: (entityId?: string) => void;
}

/** Label size factor from the label_scale option (1 = 100 %). */
export const labelScale = (ctx: ViewContext): number => (ctx.config.label_scale ?? 100) / 100;

/**
 * Keeps a centred label inside the drawing: estimates its width from the longer of
 * value line and name line and moves the x position away from the edges.
 */
export function clampLabelX(x: number, value: string, name: string, valuePx: number, namePx: number, width: number): number {
  const half = Math.max(value.length * valuePx * 0.66, name.length * namePx * 0.68) / 2 + 10;
  return Math.min(width - half, Math.max(half, x));
}

export const COLOR = {
  pv: "var(--vce-pv-color)",
  grid: "var(--vce-grid-color)",
  gridOut: "var(--vce-grid-return-color)",
  batOut: "var(--vce-battery-out-color)",
  batIn: "var(--vce-battery-in-color)",
  home: "var(--vce-home-color)",
} as const;

/** Keyboard + pointer handlers that open the more-info dialog for an entity. */
export function clickable(ctx: ViewContext, entityId?: string) {
  return {
    role: entityId ? "button" : undefined,
    tabindex: entityId ? 0 : undefined,
    onClick: () => ctx.moreInfo(entityId),
    onKey: (ev: KeyboardEvent) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        ctx.moreInfo(entityId);
      }
    },
  };
}
