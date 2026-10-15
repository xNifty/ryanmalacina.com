/*
  The standalone pages, written in markdown at /admin/pages.

  GET /about
  GET /now
  GET /uses

  An unpublished page is a 404.
*/
import express from "express";

import { getPage } from "../services/pages.js";
import { renderPage } from "../services/markdown.js";
import { strings } from "../config/constants.js";

/**
 * @param {string} key - about | now | uses
 */
export function pageRoute(key) {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    const page = await getPage(key);
    if (!page?.isPublished) return next();

    res.render("page", {
      title: key === "about" ? strings.pageHeader.about : `${page.label} | Ryan Malacina`,
      section: key,
      highlight: true,
      description: page.intro || undefined,
      ogImage: `/og/page/${key}.png`,
      page,
      isAbout: key === "about",
      isNow: key === "now",
      bodyHtml: renderPage(page.bodyMarkdown),
    });
  });

  return router;
}

export default pageRoute;
