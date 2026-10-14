/*
  Admin: news

  GET    /admin/news               - list, filterable with ?status=published|drafts
  GET    /admin/news/new           - editor for a new entry
  POST   /admin/news               - create
  GET    /admin/news/:id/edit      - editor
  POST   /admin/news/:id           - save
  PUT    /admin/news/:id/publish   - publish (HTMX: returns the row)
  PUT    /admin/news/:id/unpublish - unpublish (HTMX: returns the row)
  DELETE /admin/news/:id           - delete (HTMX: removes the row)
*/
import express from "express";

import * as news from "../../services/news.js";
import { validateNewsForm } from "../../utils/validation.js";
import logErrorToFile from "../../utils/errorLogging.js";
import { strings } from "../../config/constants.js";
import { statusTabs, renderRowAction, duplicateFieldError } from "./helpers.js";

const ROUTER = express.Router();

const TABS = [
  { key: "", label: "All" },
  { key: "published", label: "Published" },
  { key: "drafts", label: "Drafts" },
];

const DUPLICATE_MESSAGES = {
  title: "Another post already uses this title.",
  slug: "Another post already uses this slug.",
};

const ROW = "admin/news-row";

ROUTER.get("/", async (req, res) => {
  const { status, tabs } = statusTabs(TABS, req.query.status);
  res.render("admin/news/index", {
    title: "News | Admin",
    section: "news",
    news: await news.listAll(status),
    tabs,
  });
});

ROUTER.get("/new", (req, res) => {
  renderEditor(res, { isNew: true, values: { isPublished: true } });
});

ROUTER.post("/", async (req, res) => {
  const { value, errors } = validateNewsForm(req.body);
  if (errors) {
    return renderEditor(res.status(400), { isNew: true, values: req.body, errors });
  }

  try {
    const entry = await news.create(value);
    req.flash("success", `Created “${entry.title}”.`);
    return res.redirect(`/admin/news/${entry._id}/edit`);
  } catch (ex) {
    const fieldError = duplicateFieldError(ex, DUPLICATE_MESSAGES);
    if (!fieldError) logErrorToFile(ex);
    return renderEditor(res.status(fieldError ? 400 : 500), {
      isNew: true,
      values: req.body,
      errors: fieldError ?? { form: strings.errors.genericError },
    });
  }
});

ROUTER.get("/:id/edit", async (req, res) => {
  const entry = await news.findById(req.params.id);
  if (!entry) return notFound(req, res);

  renderEditor(res, { entry, values: entry.toObject() });
});

ROUTER.post("/:id", async (req, res) => {
  const entry = await news.findById(req.params.id);
  if (!entry) return notFound(req, res);

  const { value, errors } = validateNewsForm(req.body);
  if (errors) {
    return renderEditor(res.status(400), { entry, values: req.body, errors });
  }

  try {
    await news.update(entry, value);
  } catch (ex) {
    const fieldError = duplicateFieldError(ex, DUPLICATE_MESSAGES);
    if (!fieldError) logErrorToFile(ex);
    return renderEditor(res.status(fieldError ? 400 : 500), {
      entry,
      values: req.body,
      errors: fieldError ?? { form: strings.errors.genericError },
    });
  }

  req.flash("success", `Saved “${entry.title}”.`);
  return res.redirect(`/admin/news/${entry._id}/edit`);
});

ROUTER.put("/:id/publish", (req, res) => publishAction(req, res, true));
ROUTER.put("/:id/unpublish", (req, res) => publishAction(req, res, false));

async function publishAction(req, res, published) {
  const row = await news.setPublished(req.params.id, published);
  if (!row) return missingRow(res);

  return renderRowAction(res, {
    row: ROW,
    item: row,
    toast: {
      type: "success",
      message: `${published ? "Published" : "Unpublished"} “${row.title}”.`,
    },
  });
}

ROUTER.delete("/:id", async (req, res) => {
  const row = await news.findRow(req.params.id);
  if (!row || !(await news.remove(req.params.id))) return missingRow(res);

  return renderRowAction(res, {
    toast: { type: "success", message: `Deleted “${row.title}”.` },
  });
});

function renderEditor(res, { isNew = false, entry, values, errors }) {
  res.render("admin/news/edit", {
    title: `${isNew ? "New post" : values.title || "Edit post"} | Admin`,
    section: "news",
    isNew,
    entry: entry?.toObject?.() ?? entry,
    action: isNew ? "/admin/news" : `/admin/news/${entry._id}`,
    draftKey: isNew ? "news:new" : `news:${entry._id}`,
    values,
    errors,
  });
}

function notFound(req, res) {
  req.flash("error", "That post doesn't exist. It may have been deleted.");
  return res.redirect("/admin/news");
}

function missingRow(res) {
  return renderRowAction(res, {
    toast: { type: "error", message: "That post no longer exists." },
  });
}

export { ROUTER as adminNewsRoute };
