/*
  Admin: the standalone pages (about, now, uses)

  GET  /admin/pages            - list
  GET  /admin/pages/:key/edit  - editor
  POST /admin/pages/:key       - save
*/
import express from "express";

import * as pages from "../../services/pages.js";
import { validatePageForm, formatTimeline } from "../../utils/validation.js";
import logErrorToFile from "../../utils/errorLogging.js";
import { strings } from "../../config/constants.js";

const ROUTER = express.Router();

ROUTER.get("/", async (req, res) => {
  res.render("admin/pages/index", {
    title: "Pages | Admin",
    section: "pages",
    pages: await pages.listPages(),
  });
});

ROUTER.get("/:key/edit", async (req, res) => {
  const page = await pages.getPage(req.params.key);
  if (!page) return notFound(req, res);

  renderEditor(res, { page, values: page });
});

ROUTER.post("/:key", async (req, res) => {
  const page = await pages.getPage(req.params.key);
  if (!page) return notFound(req, res);

  const { value, errors } = validatePageForm(req.body);
  if (errors) {
    return renderEditor(res.status(400), { page, values: req.body, errors });
  }

  try {
    await pages.savePage(page.key, value);
  } catch (ex) {
    logErrorToFile(ex);
    return renderEditor(res.status(500), {
      page,
      values: req.body,
      errors: { form: strings.errors.genericError },
    });
  }

  req.flash("success", `Saved “${value.title}”.`);
  return res.redirect(`/admin/pages/${page.key}/edit`);
});

function renderEditor(res, { page, values, errors }) {
  res.render("admin/pages/edit", {
    title: `${page.label} | Admin`,
    section: "pages",
    page,
    action: `/admin/pages/${page.key}`,
    draftKey: `page:${page.key}`,
    values: { ...values, timeline: formatTimeline(values.timeline) },
    errors,
  });
}

function notFound(req, res) {
  req.flash("error", "There's no page with that name.");
  return res.redirect("/admin/pages");
}

export { ROUTER as adminPagesRoute };
