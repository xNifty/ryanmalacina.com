/*
  The admin area. Every route below /admin requires a signed-in admin and renders with the
  admin layout.

  GET  /admin                  - dashboard
  GET  /admin/health           - service status panel (loaded by the dashboard)
  POST /admin/preview/:kind    - rendered markdown for the editor preview (project | news)
  GET  /admin/settings         - site settings (blog on/off)
  POST /admin/settings         - save them
  /admin/projects/...          - see projects.js
  /admin/news/...              - see news.js
*/
import express from "express";
import config from "config";

import auth from "../../utils/auth.js";
import * as projects from "../../services/projects.js";
import * as news from "../../services/news.js";
import { checkHealth } from "../../services/health.js";
import { getSettings, updateSettings } from "../../services/settings.js";
import { renderProjectPage, renderNews } from "../../services/markdown.js";
import { strings } from "../../config/constants.js";
import { adminProjectsRoute } from "./projects.js";
import { adminNewsRoute } from "./news.js";

const ROUTER = express.Router();

ROUTER.use(auth.requireAdmin);
ROUTER.use((req, res, next) => {
  res.locals.layout = "admin";
  next();
});

ROUTER.get("/", async (req, res) => {
  const [projectStats, newsStats, recentProjects, recentNews] = await Promise.all([
    projects.stats(),
    news.stats(),
    projects.recentlyUpdated(6),
    news.recentlyUpdated(6),
  ]);

  const recent = [
    ...recentProjects.map((p) => ({
      kind: "Project",
      title: p.name,
      url: `/admin/projects/${p._id}/edit`,
      isPublished: p.isPublished,
      updatedAt: p.updatedAt,
    })),
    ...recentNews.map((n) => ({
      kind: "News",
      title: n.title,
      url: `/admin/news/${n._id}/edit`,
      isPublished: n.isPublished,
      updatedAt: n.updatedAt,
    })),
  ]
    .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
    .slice(0, 6);

  res.render("admin/dashboard", {
    title: strings.pageHeader.admin,
    section: "dashboard",
    projectStats,
    newsStats,
    featuredLimit: projects.FEATURED_LIMIT,
    recent,
  });
});

// Loaded after the page so a slow Ghost doesn't hold up the dashboard
ROUTER.get("/health", async (req, res) => {
  res.render("partials/admin/health", { layout: false, services: await checkHealth() });
});

const PREVIEWS = {
  project: (markdown) => renderProjectPage(markdown),
  news: (markdown) => renderNews(markdown).html,
};

ROUTER.post("/preview/:kind", (req, res) => {
  const render = PREVIEWS[req.params.kind];
  if (!render) return res.status(404).end();

  const markdown = req.body.descriptionMarkdown ?? req.body.bodyMarkdown ?? "";
  if (typeof markdown !== "string" || markdown.trim() === "") {
    return res.send('<p class="preview-empty">Nothing to preview yet.</p>');
  }
  return res.send(render(markdown));
});

ROUTER.get("/settings", async (req, res) => {
  res.render("admin/settings", {
    title: "Settings | Admin",
    section: "settings",
    settings: await getSettings(),
    blogURL: config.get("blogURL"),
  });
});

ROUTER.post("/settings", async (req, res) => {
  const { showBlog } = await updateSettings({ showBlog: req.body.showBlog === "on" });
  req.flash("success", showBlog ? "The blog is switched on." : "The blog is switched off.");
  res.redirect("/admin/settings");
});

ROUTER.use("/projects", adminProjectsRoute);
ROUTER.use("/news", adminNewsRoute);

export { ROUTER as adminRoute };
