const MAX_SLUG_LENGTH = 80;

/**
 * URL-safe slug: lowercase ASCII letters, digits and single hyphens.
 * @param {string} text - e.g. a project name or news title
 * @param {string} fallback - Used when nothing usable is left, e.g. a title of only symbols
 */
export function slugify(text, fallback = "item") {
  const slug = String(text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents: "Café" -> "Cafe"
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");

  return slug || fallback;
}

/**
 * First of base, base-2, base-3, ... that isTaken() says is free.
 * @param {string} base - A slug from slugify
 * @param {Function} isTaken - async (candidate) => boolean
 */
export async function uniqueSlug(base, isTaken) {
  let candidate = base;
  for (let n = 2; await isTaken(candidate); n++) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export default { slugify, uniqueSlug };
