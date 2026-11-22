import { css } from "lit";

export const cardStyles = css`
  :host {
    /* Energy colors follow the Home Assistant energy dashboard theme variables. */
    --vce-pv-color: var(--energy-solar-color, #ff9800);
    --vce-grid-color: var(--energy-grid-consumption-color, #488fc2);
    --vce-grid-return-color: var(--energy-grid-return-color, #8353d1);
    --vce-battery-out-color: var(--energy-battery-out-color, #4db6ac);
    --vce-battery-in-color: var(--energy-battery-in-color, #f06292);
    --vce-home-color: var(--vce-home, #3f8fd0);
    --vce-idle-color: rgba(0, 0, 0, 0.16);

    --vce-wall-l: #dfe3e7;
    --vce-wall-r: #c9ced4;
    --vce-roof: #4f5862;
    --vce-roof-edge: #76818c;
    --vce-panel: #1d2834;
    --vce-panel-line: #4d6d8d;
    --vce-window: #9fb3c6;
    --vce-box: #f7f7f7;
    --vce-box-line: #9aa1a8;
    --vce-ground: rgba(40, 50, 60, 0.1);
    --vce-box-top: #ffffff;
    --vce-box-side: #d6dade;
    --vce-dev-dark: #2f3a40;
    --vce-dev-dark-top: #46535a;
    --vce-dev-dark-side: #222a2e;
    --vce-lamp-off: #6f7880;
    --vce-door: #7b5d47;
    --vce-path: #d4cdc2;
    --vce-path-joint: #b9b1a5;
    --vce-sill: #e9ecef;
    --vce-lawn: #d5e6c3;
    --vce-hedge: #8fb37a;
    display: block;
    height: 100%;
  }
  :host([dark]) {
    --vce-idle-color: rgba(255, 255, 255, 0.13);
    --vce-wall-l: #3a3b3d;
    --vce-wall-r: #2d2e30;
    --vce-roof: #26282b;
    --vce-roof-edge: #56595e;
    --vce-panel: #12171d;
    --vce-panel-line: #3b4b5b;
    --vce-window: #4b5966;
    --vce-box: #d8d8d8;
    --vce-box-line: #8c8c8c;
    --vce-ground: rgba(0, 0, 0, 0.45);
    --vce-box-top: #ececec;
    --vce-box-side: #a4a7aa;
    --vce-dev-dark: #2b3338;
    --vce-dev-dark-top: #3f4a50;
    --vce-dev-dark-side: #1c2226;
    --vce-lamp-off: #55595e;
    --vce-door: #5b4536;
    --vce-path: #4a4744;
    --vce-path-joint: #3a3836;
    --vce-sill: #57595c;
    --vce-lawn: #263224;
    --vce-hedge: #3c5236;
  }

  ha-card {
    container-type: inline-size;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /*
   * Sizing. ha-card is the size container:
   * - automatic height: the drawing takes its natural aspect ratio,
   * - fixed height (sections layout tab): the drawing shrinks or grows to fill what is left,
   * - wide cards (≥ 720px): drawing on the left, chips, bar and key figures on the right.
   * Font sizes of the bar, legend and key figures follow the card width (cqi units).
   */
  .body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .scene-wrap {
    flex: 1 1 auto;
    /* With a fixed card height the drawing keeps at least 40 % of it; percentages
       resolve to nothing with automatic height, so the natural size applies there. */
    min-height: max(120px, 40%);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .scene-wrap > .scene {
    width: 100%;
    height: 100%;
    max-height: 100%;
  }
  .side {
    flex: 0 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  @container (min-width: 720px) {
    .body {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(300px, 1fr);
      align-items: center;
    }
    .scene-wrap {
      height: 100%;
    }
    .side {
      justify-content: center;
      padding: 8px 0;
    }
    .side .kpis {
      border-top: 0;
      margin: 12px 16px 4px;
      border: 1px solid var(--divider-color);
      border-radius: 10px;
    }
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 12px 0 16px;
    min-height: 40px;
  }
  .header h1 {
    margin: 0;
    font-size: var(--ha-card-header-font-size, 20px);
    font-weight: var(--ha-font-weight-normal, 400);
    color: var(--ha-card-header-color, var(--primary-text-color));
    line-height: 1.2;
  }
  .switcher {
    display: flex;
    gap: 2px;
    margin-left: auto;
    --mdc-icon-button-size: 36px;
    --mdc-icon-size: 20px;
  }
  .switcher ha-icon-button {
    color: var(--secondary-text-color);
    border-radius: 50%;
  }
  .switcher ha-icon-button[selected] {
    color: var(--primary-color);
    background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.14);
  }

  .warning {
    margin: 8px 16px 0;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    color: var(--primary-text-color);
    background: rgba(var(--rgb-warning-color, 255, 166, 0), 0.18);
  }

  .scene {
    display: block;
    width: 100%;
    height: auto;
  }
  .scene text {
    font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, sans-serif));
    fill: var(--primary-text-color);
  }
  .scene .val { font-size: 24px; font-weight: 700; }
  .scene .unit { font-size: 13px; font-weight: 700; }
  .scene .name { font-size: 12.5px; fill: var(--secondary-text-color); }
  .scene .sub { font-size: 12px; font-weight: 700; }
  .scene .strong { font-size: 12.5px; font-weight: 500; }
  .scene .small { font-size: 11.5px; font-weight: 500; }
  .scene .muted { fill: var(--secondary-text-color); }
  .leader { stroke: var(--secondary-text-color); stroke-width: 1; opacity: 0.7; }
  .link { cursor: pointer; outline: none; }
  .link:focus-visible .val,
  .link:focus-visible circle { filter: drop-shadow(0 0 3px var(--primary-color)); }

  .ground { fill: var(--vce-ground); }
  .wall-l { fill: var(--vce-wall-l); }
  .wall-r, .hp-side { fill: var(--vce-wall-r); }
  .hp-top { fill: var(--vce-wall-l); }
  .hp-front { fill: var(--vce-box); }
  .hp-top, .hp-side, .hp-front { stroke: var(--vce-box-line); stroke-width: 0.6; }
  .hp-fan { fill: none; stroke: var(--vce-box-line); stroke-width: 1.2; }
  .hp-fan.on { stroke: #ef5350; }
  .solid { stroke: var(--vce-box-line); stroke-width: 0.6; stroke-linejoin: round; }
  .slat { fill: none; stroke: var(--vce-box-side); stroke-width: 1; }
  .mullion { fill: none; stroke: var(--vce-box-side); stroke-width: 1.2; }
  .joint { fill: none; stroke: var(--vce-path-joint); stroke-width: 1; }
  .foot { stroke: var(--vce-box-line); stroke-width: 1.6; }
  .glow { opacity: 0; transition: opacity 0.5s; }
  .on .glow, .glow.on { opacity: 1; }
  .lamp-head { fill: var(--vce-lamp-off); transition: fill 0.4s; }
  .on .lamp-head { fill: #ffd27a; }
  .lawn { fill: var(--vce-lawn); }
  .hedge { fill: var(--vce-hedge); }
  .trunk { fill: var(--vce-door); }
  .ac-grille { fill: none; stroke: var(--vce-box-line); stroke-width: 1; }
  .ac-grille.on { stroke: #ab47bc; }
  .roof { fill: var(--vce-roof); }
  .roof-edge { stroke: var(--vce-roof-edge); stroke-width: 3; fill: none; stroke-linejoin: round; }
  .panel { fill: var(--vce-panel); stroke: var(--vce-panel-line); stroke-width: 0.8; }
  .panel-grid { stroke: var(--vce-panel-line); stroke-width: 0.6; fill: none; }
  .win { fill: var(--vce-window); }
  .box { fill: var(--vce-box); stroke: var(--vce-box-line); stroke-width: 0.8; }
  .soc { fill: var(--vce-battery-out-color); }
  .wallbox { fill: #2f3a40; stroke: var(--vce-box-line); stroke-width: 0.8; }
  .wallbox-cable { fill: none; stroke: #2f3a40; stroke-width: 2; stroke-linecap: round; }
  .led { fill: #7d8a90; }
  .led.on { fill: #66bb6a; }

  .cable { fill: none; stroke: var(--vce-idle-color); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .flow {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 7 13;
    animation: vce-dash 2s linear infinite;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .flow.on { opacity: 1; }
  .static .flow { animation: none; stroke-dasharray: none; }
  @keyframes vce-dash { to { stroke-dashoffset: -40; } }

  .fl-line { fill: none; stroke: var(--vce-idle-color); stroke-width: 1.5; }
  .fl-line.on { stroke-width: 2; }
  .node-ring { fill: var(--card-background-color, var(--ha-card-background)); stroke-width: 2.5; }
  .dev-ring { fill: var(--card-background-color, var(--ha-card-background)); stroke-width: 2; }

  /* Appliance chips (water heater, heating rods) */
  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    padding: 0 16px 12px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px 4px 8px;
    border: 1px solid var(--divider-color);
    border-radius: 16px;
    font-size: 12.5px;
    color: var(--secondary-text-color);
    cursor: pointer;
    background: none;
    font-family: inherit;
  }
  .chip ha-svg-icon { --mdc-icon-size: 16px; }
  .chip b { color: var(--primary-text-color); font-weight: 500; font-variant-numeric: tabular-nums; }
  .chip .state { font-size: 11px; }
  .chip.on {
    border-color: color-mix(in srgb, var(--chip-color) 55%, transparent);
    background: color-mix(in srgb, var(--chip-color) 12%, transparent);
  }
  .chip.on ha-svg-icon, .chip.on .state { color: var(--chip-color); }
  .chip:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }

  /* Consumption bar */
  .consumption { display: grid; gap: 10px; padding: 4px 16px 4px; }
  .consumption-row { display: flex; align-items: center; gap: 12px; }
  .total {
    font-size: clamp(22px, 6.2cqi, 40px);
    font-weight: 300;
    line-height: 1;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .total small { font-size: clamp(12px, 2.8cqi, 16px); color: var(--secondary-text-color); margin-left: 1px; }
  .bar { flex: 1; display: flex; gap: 1px; height: 34px; border-radius: 7px; overflow: hidden; min-width: 0; }
  .segment {
    display: grid;
    place-items: center;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    transition: flex-grow 0.5s, filter 0.15s;
  }
  .segment span { text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35); }
  .segment.dark span { color: #1d1d1d; text-shadow: none; }
  .bar:hover .segment:not(:hover) { filter: saturate(0.4) brightness(0.8); }
  .legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 14px;
    font-size: clamp(11.5px, 2.7cqi, 14px);
    color: var(--secondary-text-color);
  }
  .legend button {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  .legend button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 4px; }
  .legend i { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }

  .kpis {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    border-top: 1px solid var(--divider-color);
    margin-top: 12px;
  }
  .kpi { display: grid; gap: 1px; padding: 10px 12px; text-align: center; }
  .kpi + .kpi { border-left: 1px solid var(--divider-color); }
  .kpi.link { cursor: pointer; }
  .kpi.link:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }
  .kpi b { font-size: clamp(14px, 3.5cqi, 22px); font-weight: 500; font-variant-numeric: tabular-nums; }
  .kpi span { font-size: clamp(10.5px, 2.4cqi, 13px); color: var(--secondary-text-color); }
  .spacer { height: 12px; }

  @media (prefers-reduced-motion: reduce) {
    .flow { animation: none; stroke-dasharray: none; }
    .dot { display: none; }
  }
`;
