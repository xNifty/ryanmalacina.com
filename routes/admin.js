/*
  Contains all the admin routes for the site

  /                         - GET - admin home
  /projects                 - GET - list all projects
  /projects/publish/:id     - PUT - publish a project
  /projects/unpublish/:id   - PUT - unpublish a project
  /news                     - GET - list all news, with the new-entry form
  /news/new                 - POST - add a news entry
  /news/publish/:id         - PUT - publish a news entry
  /news/unpublish/:id       - PUT - unpublish a news entry
  /news/delete/:id          - PUT - delete a news entry
  /news/:id/edit            - GET - edit a news entry
  /news/:id/edit            - POST - save an edited news entry
  /news/delete-modal/:id    - GET - the delete confirmation modal for a news entry
*/

import express from "express";

import * as projects from "../services/projects.js";
import * as news from "../services/news.js";
import { validateNews } from "../models/news.js";
import auth from "../utils/auth.js";
import logErrorToFile from "../utils/errorLogging.js";
import { renderDeleteModal } from "../utils/renderPartial.js";
import { strings } from "../config/constants.js";

const ROUTER = express.Router();

// Every admin route requires a signed-in admin
const ADMIN = [auth.ValidateLoggedIn(), auth.ValidateAdmin];
const ADMIN_FORM = [auth.ValidateLoggedIn(true), auth.ValidateAdmin];

ROUTER.get("/", ADMIN, async (req, res) => {
  res.render("admin", {
    layout: "admin",
    title: strings.pageHeader.admin,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.get("/projects", ADMIN, async (req, res) => {
  res.render("admin/projects/projects", {
    layout: "admin",
    title: strings.pageHeader.adminProject,
    projects: await projects.listAll(),
    csrfToken: res.locals._csrf,
  });
});

ROUTER.put("/projects/publish/:id", ADMIN, (req, res) =>
  publishAction(req, res, () => projects.setPublished(req.params.id, true), {
    success: strings.success.projectPublished,
    location: "/admin/projects",
  })
);

ROUTER.put("/projects/unpublish/:id", ADMIN, (req, res) =>
  publishAction(req, res, () => projects.setPublished(req.params.id, false), {
    success: strings.success.projectUnpublished,
    location: "/admin/projects",
  })
);

ROUTER.get("/news", ADMIN, async (req, res) => {
  return renderNewsList(res);
});

ROUTER.post("/news/new", ADMIN_FORM, async (req, res) => {
  const { _csrf, ...fields } = req.body;
  const { error } = validateNews(fields);

  if (error) {
    const descriptionInvalid = error.details.some(
      (detail) => detail.context.key === "news_description"
    );
    return renderNewsList(res.status(400), {
      error: descriptionInvalid ? strings.errors.newsDescriptionLength : strings.errors.allFieldsRequired,
      news_title: req.body.news_title,
      news_description: req.body.news_description,
    });
  }

  try {
    await news.create(fields.news_title, fields.news_description);
  } catch (ex) {
    logErrorToFile(ex);
    return renderNewsList(res.status(400), {
      error: strings.errors.allFieldsRequired,
      news_title: req.body.news_title,
      news_description: req.body.news_description,
    });
  }

  req.flash("success", strings.success.newsAdded);
  return res.redirect("/admin/news");
});

ROUTER.put("/news/publish/:id", ADMIN, (req, res) =>
  publishAction(req, res, () => news.setPublished(req.params.id, true), {
    success: strings.success.newsPublished,
    location: "/admin/news",
  })
);

ROUTER.put("/news/unpublish/:id", ADMIN, (req, res) =>
  publishAction(req, res, () => news.setPublished(req.params.id, false), {
    success: strings.success.newsUnpublished,
    location: "/admin/news",
  })
);

ROUTER.put("/news/delete/:id", ADMIN, async (req, res) => {
  let deleted = false;
  try {
    deleted = await news.remove(req.params.id);
  } catch (err) {
    logErrorToFile(err);
  }

  req.flash(deleted ? "success" : "error", deleted ? strings.success.deleteSuccess : strings.errors.publishError);
  res.setHeader("HX-Redirect", "/admin/news");
  return res.status(deleted ? 200 : 500).end();
});

ROUTER.get("/news/:id/edit", ADMIN, async (req, res) => {
  const entry = await news.findById(req.params.id);

  if (!entry) {
    req.flash("error", strings.errors.genericError);
    return res.redirect("/admin/news");
  }

  return renderNewsEdit(res, {
    id: entry._id,
    news_title: entry.news_title,
    news_description: entry.news_description_markdown,
  });
});

ROUTER.post("/news/:id/edit", ADMIN_FORM, async (req, res) => {
  const { _csrf, ...fields } = req.body;
  const { error } = validateNews(fields);
  const form = {
    id: req.params.id,
    news_title: req.body.news_title,
    news_description: req.body.news_description,
  };

  if (error) {
    return renderNewsEdit(res.status(400), { ...form, error: strings.errors.allFieldsRequired });
  }

  let found;
  try {
    found = await news.update(req.params.id, fields.news_title, fields.news_description);
  } catch (ex) {
    logErrorToFile(ex);
    return renderNewsEdit(res.status(400), { ...form, error: strings.errors.allFieldsRequired });
  }

  if (!found) {
    req.flash("error", strings.errors.genericError);
    return res.redirect("/admin/news");
  }

  req.flash("success", strings.success.newsEdited);
  return res.redirect("/admin/news");
});

ROUTER.get("/news/delete-modal/:id", ADMIN, (req, res) => {
  return renderDeleteModal(res, "/admin/news/delete/", req.params.id);
});

/**
 * Run a publish/unpublish action and tell HTMX to reload the list.
 * @param {Function} action - Resolves true if the entry exists
 */
async function publishAction(req, res, action, { success, location }) {
  let found = false;
  try {
    found = await action();
  } catch (err) {
    logErrorToFile(err);
  }

  req.flash(found ? "success" : "error", found ? success : strings.errors.publishError);
  res.set("HX-Location", location);
  return res.status(found ? 200 : 400).end();
}

async function renderNewsList(res, extra = {}) {
  return res.render("admin/news/news", {
    layout: "admin",
    markdownEditor: true,
    title: strings.pageHeader.adminProject,
    news: await news.listAll(),
    csrfToken: res.locals._csrf,
    ...extra,
  });
}

function renderNewsEdit(res, context) {
  return res.render("admin/news/edit", {
    layout: "admin",
    markdownEditor: true,
    title: context.news_title,
    csrfToken: res.locals._csrf,
    ...context,
  });
}

export { ROUTER as adminRoute };
