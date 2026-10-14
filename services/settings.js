/*
  Site settings edited at /admin/settings. Read on most requests, so they're cached in memory
  and the cache is cleared on save. Until the first save, defaults come from config
  (showBlog), so an existing config keeps working.
*/
import config from "config";

import { Settings } from "../models/settings.js";
import logErrorToFile from "../utils/errorLogging.js";

const ID = "site";
// Re-read occasionally in case another process (or a manual DB edit) changed them
const CACHE_MS = 60 * 1000;

let cached = null;
let cachedAt = 0;

function defaults() {
  return { showBlog: config.has("showBlog") ? Boolean(config.get("showBlog")) : false };
}

/**
 * @returns {Promise<{ showBlog: boolean }>}
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

  cached = { ...defaults(), ...(stored && { showBlog: stored.showBlog }) };
  cachedAt = Date.now();
  return cached;
}

/**
 * @param {{ showBlog: boolean }} changes
 * @returns {Promise<{ showBlog: boolean }>} - The settings now in effect
 */
export async function updateSettings({ showBlog }) {
  await Settings.updateOne({ _id: ID }, { $set: { showBlog: Boolean(showBlog) } }, { upsert: true });
  clearSettingsCache();
  return getSettings();
}

export function clearSettingsCache() {
  cached = null;
  cachedAt = 0;
}

export default { getSettings, updateSettings, clearSettingsCache };
