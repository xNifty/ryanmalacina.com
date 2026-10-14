import express from "express";

import { News } from "../models/news.js";
import { highlightTerm } from "../utils/highlight.js";

const ROUTER = express.Router();

ROUTER.get("/", async (req, res) => {
  var news_list;

  let page = req.query.page;
  let term = req.query.term;

  if (page == undefined) {
    page = 1;
  }

  news_list = await listNews(5, page, term);

  for (var x in news_list["newsItems"]) {
    let counter_number = x;
    counter_number++;
    news_list["newsItems"][x].counter = counter_number;
  }

  return res.render("news-index", {
    layout: "newsIndex",
    title: "Ryan Malacina | News",
    news: news_list["newsItems"],
    totalPages: news_list["totalPages"],
    totalItems: news_list["totalDocs"],
    currentPage: page,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.post("/", async (req, res) => {
  var news_list;

  let page = req.query.page;
  let term = req.query.term;
  let sort = req.query.sort;

  if (page == undefined) {
    page = 1;
  }

  if (req.body.search) {
    news_list = await newsSearchMongo(req.body.search, 5, 1, sort);
  } else {
    news_list = await listNews(5, page, term, sort);
  }

  if (req.body.search) {
    for (var x in news_list["newsItems"]) {
      let counter_number = x;
      counter_number++;
      news_list["newsItems"][x].counter = counter_number;
      news_list["newsItems"][x].news_title = highlightTerm(news_list["newsItems"][x].news_title, req.body.search);
      news_list["newsItems"][x].news_description_html = highlightTerm(news_list["newsItems"][x].news_description_html, req.body.search);
    }
  } else {
    for (var x in news_list["newsItems"]) {
      let counter_number = x;
      counter_number++;
      news_list["newsItems"][x].counter = counter_number;
    }
  }

  return res.render("partials/news/news-display", {
    layout: false,
    news: news_list["newsItems"],
    totalPages: news_list["totalPages"],
    totalItems: news_list["totalDocs"],
    currentPage: page,
  });
});

ROUTER.post("/search", async (req, res) => {
  var news_list;
  var search = false;
  var term;

  var sort = req.query.sort;

  let page = req.query.page;
  if (page == undefined) {
    page = 1;
  }

  if (req.body.search) {
    news_list = await newsSearchMongo(req.body.search, 5, 1, sort);
    search = true;
    term = req.body.search;
  } else {
    news_list = await listNews(5, page, null, sort);
  }

  if (req.body.search) {
    for (var x in news_list["newsItems"]) {
      let counter_number = x;
      counter_number++;
      news_list["newsItems"][x].counter = counter_number;
      news_list["newsItems"][x].news_title = highlightTerm(news_list["newsItems"][x].news_title, term);
      news_list["newsItems"][x].news_description_html = highlightTerm(news_list["newsItems"][x].news_description_html, term);
    }
  } else {
    for (var x in news_list["newsItems"]) {
      let counter_number = x;
      counter_number++;
      news_list["newsItems"][x].counter = counter_number;
    }
  }

  return res.render("partials/news/news-display", {
    layout: false,
    news: news_list["newsItems"],
    totalPages: news_list["totalPages"],
    totalItems: news_list["totalDocs"],
    currentPage: 1,
    search: search,
    searchTerm: term,
  });
});

const MONGO_SORTS = {
  dateAsc: { published_date_unclean: 1 },
  dateDesc: { published_date_unclean: -1 },
  titleAsc: { news_title: 1 },
  titleDesc: { news_title: -1 },
};

function paginateNews(query, limit, page, sort) {
  // Only published entries are ever public; mongoose-paginate-v2 has no filter option,
  // so the filter has to live in the query itself
  return News.paginate(
    { ...query, is_published: true },
    {
      page: page,
      limit: limit,
      sort: MONGO_SORTS[sort] ?? { _id: -1 },
      select: {
        news_title: 1,
        published_date: 1,
        news_description_html: 1,
        _id: 0,
      },
      lean: true,
      customLabels: { docs: "newsItems" },
    }
  );
}

async function listNews(limit = 5, page = 1, term = null, sort = null) {
  if (typeof term === "string" && term !== "") {
    return paginateNews({ $text: { $search: term } }, limit, page, sort);
  }
  return paginateNews({}, limit, page, sort);
}

async function newsSearchMongo(strSearch, limit = 5, page = 1, sort = null) {
  return paginateNews({ $text: { $search: `"${strSearch}"` } }, limit, page, sort);
}

export { ROUTER as newsRoute };
// module.exports = router;
