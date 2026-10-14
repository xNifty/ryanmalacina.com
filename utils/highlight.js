function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wrap each case-insensitive match of the search's words in <mark>, only in text between tags.
 * The marked text is the content's own match, never the user's input, so a search can't
 * inject markup and tag attributes are never rewritten.
 * @param {string} html - Stored (already sanitised or escaped) HTML or plain text
 * @param {string} term - The user's search; each word is highlighted separately
 * @returns {string}
 */
export function highlightTerm(html, term) {
  if (typeof html !== "string" || typeof term !== "string") return html;

  const words = term
    .split(/\s+/)
    .map((word) => word.replace(/^["']+|["']+$/g, ""))
    .filter(Boolean)
    // Longest first, so "htmx" wins over "h" when both are searched
    .sort((a, b) => b.length - a.length);
  if (words.length === 0) return html;

  const regex = new RegExp(words.map(escapeRegExp).join("|"), "gi");

  // Tags and entities (e.g. &#60;) are left whole; only the text between them is marked
  return html
    .split(/(<[^>]*>|&#?\w+;)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(regex, (match) => `<mark>${match}</mark>`)))
    .join("");
}

export default { highlightTerm };
