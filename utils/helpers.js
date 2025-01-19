// List of helper functions that we can use within app.js

import path from "path";
import { readFileSync } from "fs";
import Handlebars from "handlebars";
import { trustedTypes } from "trusted-types";

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

  const contentHash = manifest[filename]?.split(".")[1];

  return `/${type}/${filename}?v=${contentHash}`;
}

const defaultPolicy = trustedTypes.createPolicy("default", {
  createHTML: (html) => html,
});

export function sanitize(options) {
  var data = options.fn(this);
  var parser = new DOMParser();
  var doc = parser.parseFromString(data, "text/html");
  var sanitizedHTML = defaultPolicy.createHTML(doc.body.innerHTML);
  return new Handlebars.SafeString(sanitizedHTML);
}

export default {
  iff,
  versionedFile,
  sanitize,
};
