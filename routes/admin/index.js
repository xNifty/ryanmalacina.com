/*
  The admin area. Every route below /admin requires a signed-in admin and renders with the
  admin layout.

  GET  /admin                  - dashboard
  GET  /admin/health           - service status panel (loaded by the dashboard)
  POST /admin/preview/:kind    - rendered markdown for the editor preview (project | news | page)
  GET  /admin/settings         - site settings (blog on/off, accent colour, home terminal)
  POST /admin/settings         - save them
  /admin/projects/...          - see projects.js
  /admin/news/...              - see news.js
  /admin/pages/...             - see pages.js
*/
import express from "express";
import config from "config";

import auth from "../../utils/auth.js";
import * as projects from "../../services/projects.js";
import * as news from "../../services/news.js";
import { checkHealth } from "../../services/health.js";
import { getSettings, updateSettings } from "../../services/settings.js";
import { renderProjectPage, renderPage, renderNews } from "../../services/markdown.js";
import { strings } from "../../config/constants.js";
import { validateSettingsForm } from "../../utils/validation.js";
import { DEFAULT_ACCENTS, accentWarnings } from "../../utils/accent.js";
import { adminProjectsRoute } from "./projects.js";
import { adminNewsRoute } from "./news.js";
import { adminPagesRoute } from "./pages.js";

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

// A switch rather than a lookup table, so the URL can never pick an arbitrary function
function previewRenderer(kind) {
  switch (kind) {
    case "project":
      return (markdown) => renderProjectPage(markdown);
    case "news":
      return (markdown) => renderNews(markdown).html;
    case "page":
      return (markdown) => renderPage(markdown);
    default:
      return null;
  }
}

ROUTER.post("/preview/:kind", (req, res) => {
  const render = previewRenderer(req.params.kind);
  if (!render) return res.status(404).end();

  const markdown = req.body.descriptionMarkdown ?? req.body.bodyMarkdown ?? "";
  if (typeof markdown !== "string" || markdown.trim() === "") {
    return res.send('<p class="preview-empty">Nothing to preview yet.</p>');
  }
  return res.send(render(markdown));
});

// Starting points for the accent pickers, one colour per theme
const ACCENT_PRESETS = [
  { name: "Terminal green", light: DEFAULT_ACCENTS.light, dark: DEFAULT_ACCENTS.dark },
  { name: "Amber", light: "#a15c07", dark: "#fbbf24" },
  { name: "Cyan", light: "#0e7490", dark: "#22d3ee" },
  { name: "Violet", light: "#6d28d9", dark: "#a78bfa" },
  { name: "Pink", light: "#be185d", dark: "#f472b6" },
  { name: "Red", light: "#c2410c", dark: "#fb7185" },
];

function renderSettings(res, { values, errors }) {
  res.render("admin/settings", {
    title: "Settings | Admin",
    section: "settings",
    values,
    errors,
    blogURL: config.get("blogURL"),
    presets: ACCENT_PRESETS,
    defaultAccents: DEFAULT_ACCENTS,
    warnings: errors ? [] : accentWarnings(values),
  });
}

ROUTER.get("/settings", async (req, res) => {
  renderSettings(res, { values: await getSettings() });
});

ROUTER.post("/settings", async (req, res) => {
  const { value, errors } = validateSettingsForm(req.body);
  if (errors) {
    return renderSettings(res.status(400), { values: { ...req.body, showBlog: value.showBlog }, errors });
  }

  // Colour inputs always post a value; the stylesheet's own colours are stored as "not set"
  if (value.accentLight === DEFAULT_ACCENTS.light) value.accentLight = "";
  if (value.accentDark === DEFAULT_ACCENTS.dark) value.accentDark = "";

  const { showBlog } = await updateSettings(value);
  req.flash("success", `Settings saved. ${showBlog ? "The blog is switched on." : "The blog is switched off."}`);
  res.redirect("/admin/settings");
});

ROUTER.use("/projects", adminProjectsRoute);
ROUTER.use("/news", adminNewsRoute);
ROUTER.use("/pages", adminPagesRoute);

export { ROUTER as adminRoute };
