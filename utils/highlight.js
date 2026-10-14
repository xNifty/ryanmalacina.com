function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wrap each case-insensitive match of term in <mark>, only in text between tags.
 * The marked text is the content's own match, never the user's term, so a search
 * can't inject markup and tag attributes are never rewritten.
 * @param {string} html - Stored (already sanitised) HTML or plain text
 * @param {string} term - The user's search term
 * @returns {string}
 */
export function highlightTerm(html, term) {
  if (typeof html !== "string" || typeof term !== "string" || term.trim() === "") {
    return html;
  }

  const regex = new RegExp(escapeRegExp(term.trim()), "gi");

  return html
    .split(/(<[^>]*>)/)
    .map((part) => (part.startsWith("<") ? part : part.replace(regex, (match) => `<mark>${match}</mark>`)))
    .join("");
}

export default { highlightTerm };
