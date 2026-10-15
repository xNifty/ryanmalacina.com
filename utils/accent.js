/*
  The accent colour picked in /admin/settings. site.css defines the default palette; this turns
  a chosen colour into the same set of custom properties (hover, soft background, text on the
  accent) so the layouts can override them in a small <style> block.
*/

export const DEFAULT_ACCENTS = { light: "#087f44", dark: "#3ddc84" };

// The page backgrounds from site.css, for the contrast check
const BACKGROUNDS = { light: "#f5f8f7", dark: "#0a1417" };
const DARK_TEXT = "#04210f";

const HEX = /^#[0-9a-f]{6}$/i;

function toRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(rgb) {
  return "#" + rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("");
}

function mix(hex, target, amount) {
  const from = toRgb(hex);
  const to = toRgb(target);
  return toHex(from.map((channel, i) => channel + (to[i] - channel) * amount));
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between two #rrggbb colours, 1 to 21.
 */
export function contrastRatio(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgba(hex, alpha) {
  return `rgba(${toRgb(hex).join(", ")}, ${alpha})`;
}

function variables(hex, theme) {
  const text = contrastRatio(hex, "#ffffff") >= contrastRatio(hex, DARK_TEXT) ? "#ffffff" : DARK_TEXT;
  const vars = {
    "--accent": hex,
    "--accent-hover": theme === "light" ? mix(hex, "#000000", 0.2) : mix(hex, "#ffffff", 0.25),
    "--accent-soft": rgba(hex, theme === "light" ? 0.1 : 0.12),
    "--accent-text": text,
  };
  if (theme === "dark") vars["--mark"] = rgba(hex, 0.28);
  return Object.entries(vars)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}

/**
 * CSS overriding the accent for either theme, or "" when neither is set. Only well-formed
 * colours are used, so the result is safe to put in a <style> element.
 * @param {{ accentLight?: string, accentDark?: string }} settings
 */
export function accentCss({ accentLight, accentDark } = {}) {
  const rules = [];
  if (HEX.test(accentLight ?? "")) {
    rules.push(`:root:not([data-theme="dark"]) { ${variables(accentLight.toLowerCase(), "light")} }`);
  }
  if (HEX.test(accentDark ?? "")) {
    rules.push(`:root[data-theme="dark"] { ${variables(accentDark.toLowerCase(), "dark")} }`);
  }
  return rules.join("\n");
}

/**
 * Readability warnings for the settings page: links are drawn in the accent colour, so it
 * needs 4.5:1 against the page background.
 * @returns {string[]}
 */
export function accentWarnings({ accentLight, accentDark } = {}) {
  const warnings = [];
  for (const [theme, hex] of [["light", accentLight], ["dark", accentDark]]) {
    if (!HEX.test(hex ?? "")) continue;
    const ratio = contrastRatio(hex, BACKGROUNDS[theme]);
    if (ratio < 4.5) {
      warnings.push(
        `The ${theme} theme accent has a contrast of ${ratio.toFixed(1)}:1 against the page, so links may be hard to read. Aim for at least 4.5:1.`
      );
    }
  }
  return warnings;
}

export default { DEFAULT_ACCENTS, accentCss, accentWarnings, contrastRatio };
