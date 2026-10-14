import path from "path";

import { createViewEngine } from "./viewEngine.js";

const engine = createViewEngine();
const EMAIL_DIR = path.resolve("views/emails");

/**
 * Render an HTML email from views/emails/<name>.handlebars. Values are escaped.
 * @param {string} name - Template name without extension, e.g. "passwordReset"
 * @param {Object} context - Template values
 * @returns {Promise<string>}
 */
export function renderEmail(name, context) {
  return engine.render(path.join(EMAIL_DIR, `${name}.handlebars`), context);
}

export default renderEmail;
