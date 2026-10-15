/*
  Public news pages

  GET /news          - the news index. Query: q (search), sort, page. Plain links and a GET
                       form, so it works without JavaScript; htmx requests get just the results.
  GET /news/:slug    - one post
*/
import express from "express";

import * as news from "../services/news.js";
import { highlightTerm } from "../utils/highlight.js";
import { strings } from "../config/constants.js";
import { formatDate } from "../utils/helpers.js";

const ROUTER = express.Router();

const PAGE_SIZE = 8;

const SORTS = [
  { key: "dateDesc", label: "Newest first" },
  { key: "dateAsc", label: "Oldest first" },
  { key: "titleAsc", label: "Title A–Z" },
  { key: "titleDesc", label: "Title Z–A" },
];

ROUTER.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const sort = SORTS.some((s) => s.key === req.query.sort) ? req.query.sort : "dateDesc";
  const page = toPage(req.query.page);

  const results = await news.paginatePublished({ page, limit: PAGE_SIZE, sort, term: q });
  // Titles are plain text: escape them, then mark search matches (bodyHtml is already sanitised HTML)
  const items = results.newsItems.map((item) => ({
    ...item,
    titleHtml: q ? highlightTerm(escapeHtml(item.title), q) : escapeHtml(item.title),
    bodyHtml: q ? highlightTerm(item.bodyHtml, q) : item.bodyHtml,
  }));

  const context = {
    title: q ? `Search: ${q} | News | Ryan Malacina` : "News | Ryan Malacina",
    news: items,
    q,
    sort,
    sorts: SORTS.map((s) => ({ ...s, selected: s.key === sort })),
    totalItems: results.totalDocs,
    pagination: pagination(results, { q, sort }),
    highlight: true,
  };

  // The search form and pager target #news-results; give htmx just that
  if (req.get("HX-Request") && req.get("HX-Target") === "news-results") {
    return res.render("partials/news/results", { layout: false, ...context });
  }
  return res.render("news-index", { ...context, section: "news" });
});

ROUTER.get("/:slug", async (req, res) => {
  const post = await news.findPublishedBySlug(req.params.slug);
  if (!post) {
    return res.status(404).render("error", {
      error: "That post doesn't exist, or it has been unpublished.",
      title: strings.pageHeader.notFound,
      status_code: strings.status[404],
    });
  }

  res.render("news-post", {
    title: `${post.title} | News | Ryan Malacina`,
    section: "news",
    highlight: true,
    description: `News from Ryan Malacina, ${formatDate(post.publishedAt, "mmmm d, yyyy")}.`,
    ogImage: `/og/news/${post.slug}.png`,
    ogType: "article",
    post,
  });
});

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function toPage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * Previous/next links that keep the search and sort.
 */
function pagination(results, { q, sort }) {
  const link = (page) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort !== "dateDesc") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return "/news" + (query ? `?${query}` : "");
  };

  return {
    page: results.page,
    totalPages: results.totalPages,
    prev: results.hasPrevPage ? link(results.prevPage) : null,
    next: results.hasNextPage ? link(results.nextPage) : null,
  };
}

export { ROUTER as newsRoute };
