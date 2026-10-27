/**
 * The 3 floating feature cards per scene + the shared Scene 5 alert,
 * copied verbatim from the prototype's `#ui0`..`#ui4` / `#alert` markup
 * (design/hero-parallax/feizm-scroll-hero.html lines 62-98) — same icon
 * paths, same text, same per-card `top` offset. Kept as plain data (icon
 * markup as a trusted literal SVG string, rendered via
 * `dangerouslySetInnerHTML` in HeroCardsOverlay) rather than hand-converting
 * each path's SVG attributes to JSX, so every path is byte-identical to
 * the source instead of risking a transcription slip across 15 icons.
 *
 * One change from the source: Scene 5's alert originally had a second
 * line of literal placeholder text, "[Vehicle ID] · [Time] · [Location]"
 * — removed per instruction (see HomeHeroParallax's own doc comment for
 * what was removed and why), not replaced with invented sample data.
 */

export interface CardData {
  top: number;
  iconSvg: string;
  text: string;
}

const ICON = (path: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF8A3D" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const SCENE_CARDS: CardData[][] = [
  // Scene 1 · Fleet
  [
    { top: 182, iconSvg: ICON('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'), text: "Real-time GPS Tracking" },
    { top: 256, iconSvg: ICON('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M3.5 10h6M14.5 10h6M12 14.5V21"/>'), text: "Driver Monitoring & Safety" },
    { top: 330, iconSvg: ICON('<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/><circle cx="12" cy="17" r="1.2"/>'), text: "Ultra-Accurate Engine Diagnostics" },
  ],
  // Scene 2 · Assets
  [
    { top: 182, iconSvg: ICON('<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>'), text: "Real-time Asset Tracking & Location" },
    { top: 256, iconSvg: ICON('<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/>'), text: "Asset Condition & Environmental Monitoring" },
    { top: 330, iconSvg: ICON('<path d="M4 5v14M7.5 5v14M11 5v14M15 5v14M17.5 5v14M20 5v14"/>'), text: "Automated Asset Registration & Attributes" },
  ],
  // Scene 3 · Video & Cloud
  [
    { top: 182, iconSvg: ICON('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>'), text: "Proof of Incidents, Cloud Storage & Warnings" },
    { top: 256, iconSvg: ICON('<path d="M5 12a7 7 0 0 1 14 0M8.5 12a3.5 3.5 0 0 1 7 0"/><circle cx="12" cy="12" r="1.2"/><path d="M12 13v8"/>'), text: "Telematics & GPS Integration" },
    { top: 330, iconSvg: ICON('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>'), text: "Driver Behavior Retraining" },
  ],
  // Scene 4 · Delivery
  [
    { top: 182, iconSvg: ICON('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 13l2 2 4-4"/>'), text: "Online Job Planning & Assignment" },
    { top: 256, iconSvg: ICON('<path d="M2 7h11v9H2zM13 10h4l3 3v3h-7"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'), text: "Real-time Delivery Status & Notifications" },
    { top: 330, iconSvg: ICON('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'), text: "Telematics Integration" },
  ],
  // Scene 5 · Monitoring
  [
    { top: 182, iconSvg: ICON('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'), text: "Alarms & Event Management" },
    { top: 256, iconSvg: ICON('<path d="M3 12h4l3-7 4 14 3-7h4"/>'), text: "Telemetry Data Collection & Processing" },
    { top: 330, iconSvg: ICON('<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 10h4v4h-4zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>'), text: "Centralized Device Management" },
  ],
];

export const ALERT_ICON_SVG =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/></svg>';
export const ALERT_TITLE = "Harsh braking detected";
