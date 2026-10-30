import express from "express";
import config from "config";
import words from "number-to-words";

import * as projects from "../services/projects.js";
import * as news from "../services/news.js";
import { listRecentPosts } from "../services/blog.js";
import { getSettings } from "../services/settings.js";
import { withRepoStats } from "../services/github.js";
import { parseHeroLines } from "../utils/validation.js";
import { validateContactForm, sendContactForm } from "../services/contact.js";
import * as turnstile from "../services/turnstile.js";

const ROUTER = express.Router();

ROUTER.get("/", async (req, res) => {
  const [featuredProjects, latestNews, projectCount] = await Promise.all([
    projects.listFeatured(),
    news.listLatestPublished(5),
    projects.countPublished(),
  ]);

  // Only query the blog if it's switched on, and hide the section if Ghost is unreachable
  const settings = await getSettings();
  let { showBlog } = settings;
  let blogPosts;
  if (showBlog) {
    try {
      blogPosts = await listRecentPosts();
    } catch (ex) {
      console.log(ex.message);
      showBlog = false;
    }
  }

  return res.render("index", {
    title: "Ryan Malacina",
    projects: await withRepoStats(featuredProjects),
    heroLines: parseHeroLines(settings.heroLines),
    news: latestNews,
    showNews: latestNews.length > 0,
    showBlog: showBlog,
    blogPosts: blogPosts,
    blogURL: config.get("blogURL"),
    project_count: words.toWords(projectCount),
    csrfToken: res.locals._csrf,
  });
});

ROUTER.post("/send", async (req, res) => {
  const { values, errors, invalid } = validateContactForm(req.body);

  if (errors.length > 0) {
    return renderContactForm(res, { errors, invalid, values });
  }

  // Checked after the fields, so a typo doesn't use up the visitor's spam-check token
  const check = await turnstile.verify(req.body[turnstile.TOKEN_FIELD], req.ip);
  if (!check.success) {
    return renderContactForm(res, { errors: [check.error], values });
  }

  if (await sendContactForm(values)) {
    return renderContactForm(res, {
      contactSent: "Message sent! I'll get back to you as soon as I can!",
    });
  }

  return renderContactForm(res, {
    errors: ["There was an error sending your message. Please try again later."],
    values,
  });
});

function renderContactForm(res, context) {
  return res.render("partials/contact-form", {
    layout: false,
    csrfToken: res.locals._csrf,
    ...context,
  });
}

export { ROUTER as homeRoute };
