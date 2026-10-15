/*
  Site settings edited at /admin/settings. Read on most requests, so they're cached in memory
  and the cache is cleared on save. Until the first save, defaults come from config
  (showBlog) and DEFAULTS below, so an existing config keeps working.
*/
import config from "config";

import { Settings } from "../models/settings.js";
import logErrorToFile from "../utils/errorLogging.js";

const ID = "site";
// Re-read occasionally in case another process (or a manual DB edit) changed them
const CACHE_MS = 60 * 1000;

const FIELDS = ["showBlog", "accentLight", "accentDark", "heroLines"];

export const DEFAULT_HERO_LINES = [
  "role: software developer",
  "day job: SQL and ASP.NET",
  "side projects: Node, Go and HTMX",
  "currently: rebuilding this site",
].join("\n");

let cached = null;
let cachedAt = 0;

function defaults() {
  return {
    showBlog: config.has("showBlog") ? Boolean(config.get("showBlog")) : false,
    accentLight: "",
    accentDark: "",
    heroLines: DEFAULT_HERO_LINES,
  };
}

function pick(source) {
  return Object.fromEntries(FIELDS.filter((key) => source?.[key] !== undefined).map((key) => [key, source[key]]));
}

/**
 * @returns {Promise<{ showBlog: boolean, accentLight: string, accentDark: string, heroLines: string }>}
 */
export async function getSettings() {
  if (cached && Date.now() - cachedAt < CACHE_MS) return cached;

  let stored;
  try {
    stored = await Settings.findById(ID).lean();
  } catch (err) {
    // Every page reads settings (the nav uses showBlog); don't fail the page over it
    logErrorToFile(err);
    return defaults();
  }

  cached = { ...defaults(), ...pick(stored) };
  cachedAt = Date.now();
  return cached;
}

/**
 * Save the given settings; anything left out keeps its current value.
 * @param {Object} changes - Any of showBlog, accentLight, accentDark, heroLines
 * @returns {Promise<Object>} - The settings now in effect
 */
export async function updateSettings(changes) {
  const $set = pick(changes);
  if ("showBlog" in $set) $set.showBlog = Boolean($set.showBlog);
  await Settings.updateOne({ _id: ID }, { $set }, { upsert: true });
  clearSettingsCache();
  return getSettings();
}

export function clearSettingsCache() {
  cached = null;
  cachedAt = 0;
}

export default { getSettings, updateSettings, clearSettingsCache, DEFAULT_HERO_LINES };
