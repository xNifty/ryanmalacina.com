import { create } from "express-handlebars";

import { iff, versionedFile } from "./helpers.js";

/**
 * The site's Handlebars engine. Two layouts: "main" (public, the default) and "admin".
 * Shared by app.js and the template tests so both render with the same config.
 */
export function createViewEngine() {
  return create({
    defaultLayout: "main",
    partialsDir: "views/partials/",
    layoutsDir: "views/layouts/",
    compilerOptions: {
      preventIndent: true,
    },
    helpers: {
      iff: iff,
      versionedFile: versionedFile,
    },
  });
}

export default createViewEngine;
