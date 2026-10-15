/*
  Link-preview images, referenced from the og:image tag (views/partials/meta.handlebars).

  GET /og/home.png
  GET /og/projects.png
  GET /og/projects/:slug.png
  GET /og/news/:slug.png
  GET /og/page/:key.png        - about | now | uses
*/
import express from "express";

import * as projects from "../services/projects.js";
import * as news from "../services/news.js";
import { getPage } from "../services/pages.js";
import { getSettings } from "../services/settings.js";
import { renderPng } from "../services/ogImage.js";
import { formatDate } from "../utils/helpers.js";

const ROUTER = express.Router();

async function send(res, options, cacheKey) {
  const { accentDark } = await getSettings();
  const png = renderPng({ ...options, accent: accentDark || undefined }, cacheKey);
  res.set("Cache-Control", "public, max-age=86400");
  res.type("png").send(png);
}

ROUTER.get("/home.png", (req, res) =>
  send(
    res,
    {
      title: "Ryan Malacina",
      subtitle: "Software developer. Projects I've built, news, and what I'm up to.",
      command: "whoami",
    },
    "home"
  )
);

ROUTER.get("/projects.png", (req, res) =>
  send(
    res,
    {
      title: "Projects",
      subtitle: "Things I've built, am building, or have contributed to.",
      command: "ls projects/",
    },
    "projects"
  )
);

ROUTER.get("/projects/:slug.png", async (req, res, next) => {
  const project = await projects.findBySlug(req.params.slug);
  if (!project?.isPublished) return next();

  return send(
    res,
    {
      title: project.name,
      subtitle: project.title !== project.name ? project.title : undefined,
      command: `cd projects/${project.slug}`,
    },
    `project:${project.slug}:${project.updatedAt?.getTime()}`
  );
});

ROUTER.get("/news/:slug.png", async (req, res, next) => {
  const post = await news.findPublishedBySlug(req.params.slug);
  if (!post) return next();

  return send(
    res,
    {
      title: post.title,
      subtitle: formatDate(post.publishedAt, "mmmm d, yyyy"),
      command: "cat news/" + post.slug + ".md",
    },
    `news:${post.slug}:${new Date(post.updatedAt ?? post.publishedAt).getTime()}`
  );
});

ROUTER.get("/page/:key.png", async (req, res, next) => {
  const page = await getPage(req.params.key);
  if (!page?.isPublished) return next();

  return send(
    res,
    { title: page.title, subtitle: page.intro || undefined, command: page.prompt },
    `page:${page.key}:${page.updatedAt ? new Date(page.updatedAt).getTime() : "default"}`
  );
});

export { ROUTER as ogRoute };
