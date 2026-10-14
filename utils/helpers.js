// List of helper functions that we can use within app.js

import path from "path";
import { readFileSync } from "fs";

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

export default {
  iff,
  versionedFile,
};
