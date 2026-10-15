/*
  Link-preview images (Open Graph, 1200×630 PNG) for pages shared on Discord, Slack, social
  sites and the like. Drawn as SVG in the site's dark terminal style and rasterised with
  resvg, using font files from npm so the server needs no fonts installed.

  Rendering takes tens of milliseconds, so results are kept in a small in-memory cache keyed
  by everything that changes the picture.
*/
import path from "path";
import { createRequire } from "module";
import { Resvg } from "@resvg/resvg-js";

import { DEFAULT_ACCENTS } from "../utils/accent.js";

// Resolved from the app root, like the other asset paths (the app runs from there)
const require = createRequire(path.resolve("package.json"));

const FONT_FILES = [
  require.resolve("@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf"),
  require.resolve("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
  require.resolve("@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf"),
  require.resolve("@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf"),
];

const WIDTH = 1200;
const HEIGHT = 630;
const PAD = 80;
const TEXT_WIDTH = WIDTH - PAD * 2;

const COLORS = {
  bg: "#0a1417",
  surface: "#0f1d22",
  border: "#1f343c",
  text: "#e2ebee",
  muted: "#93a8b0",
  faint: "#6c8590",
  cyan: "#5cc8f0",
};

const CACHE_LIMIT = 200;
const cache = new Map();

function escapeXml(text) {
  return String(text ?? "").replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Greedy word wrap using an average character width, which is close enough for a preview.
 * Overflow past maxLines is cut with an ellipsis.
 */
export function wrapText(text, { fontSize, charWidth, maxWidth = TEXT_WIDTH, maxLines }) {
  const perLine = Math.max(1, Math.floor(maxWidth / (fontSize * charWidth)));
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    // Break words longer than a whole line
    let rest = word;
    while (rest.length > perLine) {
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(rest.slice(0, perLine - 1) + "-");
      rest = rest.slice(perLine - 1);
    }
    const next = line ? `${line} ${rest}` : rest;
    if (next.length > perLine) {
      lines.push(line);
      line = rest;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s*\S{0,3}$/, "").slice(0, perLine - 1) + "…";
    return kept;
  }
  return lines;
}

function titleLayout(title) {
  // Shorter titles get bigger type
  for (const fontSize of [84, 72, 60, 52]) {
    const lines = wrapText(title, { fontSize, charWidth: 0.56, maxLines: 3 });
    if (lines.length <= 2 || fontSize === 52) return { fontSize, lines };
  }
}

/**
 * The preview as an SVG string.
 * @param {Object} options
 * @param {string} options.title - The big text
 * @param {string} [options.subtitle] - Up to two lines under it
 * @param {string} [options.command] - Shown after the prompt at the top, e.g. "cat now.md"
 * @param {string} [options.accent] - #rrggbb; the dark theme accent
 */
export function renderSvg({ title, subtitle, command = "whoami", accent }) {
  const accentColor = /^#[0-9a-f]{6}$/i.test(accent ?? "") ? accent : DEFAULT_ACCENTS.dark;
  const { fontSize, lines } = titleLayout(title);
  const lineHeight = Math.round(fontSize * 1.12);
  const subtitleLines = subtitle ? wrapText(subtitle, { fontSize: 32, charWidth: 0.48, maxLines: 2 }) : [];

  const titleTop = 230;
  const subtitleTop = titleTop + (lines.length - 1) * lineHeight + 70;

  const titleText = lines
    .map((line, i) => `<tspan x="${PAD}" y="${titleTop + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");
  const subtitleText = subtitleLines
    .map((line, i) => `<tspan x="${PAD}" y="${subtitleTop + i * 44}">${escapeXml(line)}</tspan>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="${COLORS.border}"/>
    </pattern>
    <radialGradient id="fade" cx="85%" cy="15%" r="75%">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="dotsMask"><rect width="100%" height="100%" fill="url(#fade)"/></mask>
  </defs>
  <rect width="100%" height="100%" fill="${COLORS.bg}"/>
  <rect width="100%" height="100%" fill="url(#dots)" mask="url(#dotsMask)"/>
  <rect x="0" y="0" width="${WIDTH}" height="8" fill="${accentColor}"/>
  <text x="${PAD}" y="${PAD + 40}" font-family="JetBrains Mono" font-size="30" fill="${COLORS.muted}"><tspan fill="${accentColor}" font-weight="700">ryan@malacina</tspan>:<tspan fill="${COLORS.cyan}">~</tspan>$ ${escapeXml(command)}</text>
  <text font-family="Inter" font-weight="800" font-size="${fontSize}" fill="${COLORS.text}" letter-spacing="-1.5">${titleText}</text>
  <text font-family="Inter" font-weight="400" font-size="32" fill="${COLORS.muted}">${subtitleText}</text>
  <line x1="${PAD}" y1="${HEIGHT - 110}" x2="${WIDTH - PAD}" y2="${HEIGHT - 110}" stroke="${COLORS.border}" stroke-width="2"/>
  <text x="${PAD}" y="${HEIGHT - 60}" font-family="JetBrains Mono" font-size="28" fill="${COLORS.faint}">ryanmalacina.com</text>
  <rect x="${WIDTH - PAD - 16}" y="${HEIGHT - 84}" width="16" height="30" fill="${accentColor}"/>
</svg>`;
}

/**
 * The preview as a PNG, cached.
 * @param {Object} options - As for renderSvg
 * @param {string} [cacheKey] - Identifies this exact picture, e.g. "project:slug:updatedAt"
 * @returns {Buffer}
 */
export function renderPng(options, cacheKey) {
  const key = cacheKey && `${cacheKey}:${options.accent ?? ""}`;
  if (key && cache.has(key)) return cache.get(key);

  const png = new Resvg(renderSvg(options), {
    fitTo: { mode: "width", value: WIDTH },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Inter" },
  })
    .render()
    .asPng();

  if (key) {
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
    cache.set(key, png);
  }
  return png;
}

export function clearOgCache() {
  cache.clear();
}

export default { renderSvg, renderPng, wrapText, clearOgCache };
