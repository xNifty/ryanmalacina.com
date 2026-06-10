import sanitize from "sanitize-html";

export function sanitizeText(value) {
  return sanitize(value ?? "", { allowedTags: [], allowedAttributes: {} });
}
