/*
  Public news pages

  GET  /news         - the news index (page, term in the query string)
  POST /news         - one page of results for the pagination control (HTMX/AJAX)
  POST /news/search  - search results for the search box (HTMX/AJAX)
*/
import express from "express";

import * as news from "../services/news.js";
import { highlightTerm } from "../utils/highlight.js";

const ROUTER = express.Router();

const PAGE_SIZE = 5;

ROUTER.get("/", async (req, res) => {
  const page = toPage(req.query.page);
  const results = await news.paginatePublished({ page, limit: PAGE_SIZE, term: req.query.term });

  return res.render("news-index", {
    pageScripts: ["jquery.simplePagination.js", "news.js"],
    title: "Ryan Malacina | News",
    news: results.newsItems,
    totalPages: results.totalPages,
    totalItems: results.totalDocs,
    currentPage: page,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.post("/", async (req, res) => {
  const page = toPage(req.query.page);
  const results = await loadResults(req, page, req.query.term);

  return renderResults(res, results, { currentPage: page });
});

ROUTER.post("/search", async (req, res) => {
  const page = toPage(req.query.page);
  const results = await loadResults(req, page, null);
  const search = searchTerm(req);

  return renderResults(res, results, {
    currentPage: 1,
    search: Boolean(search),
    searchTerm: search || undefined,
  });
});

/**
 * A search-box submission (body.search) returns the first page of exact-phrase matches with
 * the term highlighted; otherwise the requested page, filtered by fallbackTerm if given.
 */
async function loadResults(req, page, fallbackTerm) {
  const sort = req.query.sort;
  const search = searchTerm(req);

  if (!search) {
    return news.paginatePublished({ page, limit: PAGE_SIZE, sort, term: fallbackTerm });
  }

  const results = await news.paginatePublished({
    page: 1,
    limit: PAGE_SIZE,
    sort,
    term: search,
    exactPhrase: true,
  });

  results.newsItems = results.newsItems.map((item) => ({
    ...item,
    news_title: highlightTerm(item.news_title, search),
    news_description_html: highlightTerm(item.news_description_html, search),
  }));

  return results;
}

function renderResults(res, results, extra) {
  return res.render("partials/news/news-display", {
    layout: false,
    news: results.newsItems,
    totalPages: results.totalPages,
    totalItems: results.totalDocs,
    ...extra,
  });
}

function searchTerm(req) {
  return typeof req.body.search === "string" ? req.body.search : "";
}

function toPage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export { ROUTER as newsRoute };
