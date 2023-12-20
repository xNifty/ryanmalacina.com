// List of helper functions that we can use within app.js

import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

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
  // Ensure basePath is a string
  const resolvedPath = typeof basePath === "string" ? basePath : "";

  const manifestPath = path.resolve(resolvedPath, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

  const contentHash = manifest[filename]?.split(".")[1];
  // console.log(
  //   `${filename}, ${manifestPath}, ${contentHash}, ${manifest[filename]}`
  // );
  //console.log(manifest);
  return `/${type}/${filename}?v=${contentHash}`;
}

export default {
  iff,
  versionedFile,
};
