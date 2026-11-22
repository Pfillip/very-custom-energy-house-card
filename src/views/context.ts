import type { PowerFormatter } from "../format";
import type { Localizer } from "../localize/localize";
import type { CardConfig, DeviceState, Flows, LightingState } from "../types";

export interface ViewContext {
  config: CardConfig;
  flows: Flows;
  soc?: number;
  devices: DeviceState[];
  lighting?: LightingState;
  gardenLighting?: LightingState;
  threshold: number;
  t: Localizer;
  power: PowerFormatter;
  moreInfo: (entityId?: string) => void;
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
