// List of helper functions that we can use within app.js

import path from "path";
import { readFileSync } from "fs";
import dateFormat from "dateformat";

export function iff(v1, operator, v2, options) {
  switch (operator) {
    case "==":
      return v1 == v2 ? options.fn(this) : options.inverse(this);
    case "===":
      return v1 === v2 ? options.fn(this) : options.inverse(this);
    case "!==":
      return v1 !== v2 ? options.fn(this) : options.inverse(this);
    case "!=":
      return v1 != v2 ? options.fn(this) : options.inverse(this);
    case "<":
      return v1 < v2 ? options.fn(this) : options.inverse(this);
    case "<=":
      return v1 <= v2 ? options.fn(this) : options.inverse(this);
    case ">":
      return v1 > v2 ? options.fn(this) : options.inverse(this);
    case ">=":
      return v1 >= v2 ? options.fn(this) : options.inverse(this);
    case "&&":
      return v1 && v2 ? options.fn(this) : options.inverse(this);
    case "||":
      return v1 || v2 ? options.fn(this) : options.inverse(this);
    default:
      return options.inverse(this);
  }
}

export function versionedFile(filename, basePath, type) {
  const resolvedPath = typeof basePath === "string" ? basePath : "";

  const manifestPath = path.resolve(resolvedPath, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  // e.g. "js/jquery.simplePagination.8e2ff96df596aba62859.js" -> "8e2ff96df596aba62859"
  const contentHash = manifest[filename]?.match(/\.([0-9a-f]+)\.[a-z]+$/)?.[1];

  return `/${type}/${filename}?v=${contentHash}`;
}

export const DATE_FORMAT = "mmmm dd, yyyy @ h:MM TT";

/**
 * {{formatDate someDate}} -> "October 14, 2026 @ 3:05 PM"; empty for a missing or invalid date.
 * An optional second argument is a dateformat mask.
 */
export function formatDate(date, mask) {
  if (!date) return "";
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return dateFormat(value, typeof mask === "string" ? mask : DATE_FORMAT);
}

/**
 * {{joinList tags}} -> "node, discord". Passes strings through, so a form re-rendered with
 * what was typed shows it unchanged.
 */
export function joinList(value) {
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value : "";
}

/**
 * {{initials "Snoring Ninja"}} -> "SN": up to two letters for project monograms.
 */
export function initials(name) {
  const words = String(name ?? "").match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

export default {
  iff,
  versionedFile,
  formatDate,
  joinList,
  initials,
};
