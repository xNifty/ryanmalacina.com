/*
  Public project pages. Editing lives under /admin/projects (routes/admin/projects.js).

  GET /projects            - all published projects
  GET /projects/:slug      - one project; old ids and earlier slugs redirect to the current slug
  GET /projects/new        - redirects to the admin editor (old bookmark)
  GET /projects/:id/edit   - redirects to the admin editor (old bookmark)
*/

import express from "express";

import * as projects from "../services/projects.js";
import { renderProjectPage } from "../services/markdown.js";
import { getRepoStats, withRepoStats } from "../services/github.js";
import { strings } from "../config/constants.js";

const ROUTER = express.Router();

ROUTER.get("/", async (req, res) => {
  res.render("projects", {
    title: "Projects | Ryan Malacina",
    section: "projects",
    description: "Things Ryan Malacina has built, is building, or has contributed to.",
    ogImage: "/og/projects.png",
    projects: await withRepoStats(await projects.listPublished()),
  });
});

ROUTER.get("/new", (req, res) => res.redirect(301, "/admin/projects/new"));

ROUTER.get("/:id/edit", (req, res) =>
  res.redirect(301, `/admin/projects/${encodeURIComponent(req.params.id)}/edit`)
);

ROUTER.get("/:slug", async (req, res) => {
  const project =
    (await projects.findBySlug(req.params.slug)) ?? (await projects.findById(req.params.slug));

  if (!project || !project.isPublished) {
    return res.status(404).render("error", {
      error: strings.errors.invalidProject,
      title: strings.pageHeader.notFound,
      status_code: strings.status[404],
    });
  }

  // Links from before slugs existed used the id, and slugs can be renamed
  if (project.slug !== req.params.slug) {
    return res.redirect(301, `/projects/${project.slug}`);
  }

  res.render("projects", {
    is_valid: true,
    section: "projects",
    highlight: true,
    project: { ...project.toObject(), github: await getRepoStats(project.source) },
    description: project.title,
    ogImage: `/og/projects/${project.slug}.png`,
    ogType: "article",
    descriptionHtml: renderProjectPage(project.descriptionMarkdown),
    title: project.name + " | Ryan Malacina",
  });
});

export { ROUTER as projectsRoute };
