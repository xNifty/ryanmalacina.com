import { create } from "express-handlebars";

import { iff, versionedFile, formatDate, joinList, initials, yearRange, compactNumber } from "./helpers.js";

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
      formatDate: formatDate,
      joinList: joinList,
      initials: initials,
      yearRange: yearRange,
      compactNumber: compactNumber,
    },
  });
}

export default createViewEngine;
