import express from "express";

import { News } from "../models/news.js";
import { CLIENT } from '../app.js';

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
    news_list = await newsSearch(req.body.search, 5, 1, sort);
  } else {
    news_list = await listNews(5, page, term, sort);
  }

  for (var x in news_list["newsItems"]) {
    let counter_number = x;
    counter_number++;
    news_list["newsItems"][x].counter = counter_number;
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
    news_list = await newsSearch(req.body.search, 5, 1, sort);
    const addQuery = (req, res, next) => {
      req.query.term = req.body.search;
      next();
    };
    search = true;
    term = req.body.search;
  } else {
    news_list = await listNews(5, page, null, sort);
  }

  for (var x in news_list["newsItems"]) {
    let counter_number = x;
    counter_number++;
    news_list["newsItems"][x].counter = counter_number;
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

async function listNews(limit = 5, page = 1, term = null, sort = null) {
  var query = { $text: { $search: term } };

  var sortMethod;

  if (!sort) {
    sortMethod = { _id: -1 };
  } else {
    if (sort === "dateAsc") {
      sortMethod = { published_date_unclean: 1 };
    } else if (sort === "dateDesc") {
      sortMethod = { published_date_unclean: -1 };
    } else if (sort === "titleAsc") {
      sortMethod = { news_title: 1 };
    } else if (sort === "titleDesc") {
      sortMethod = { news_title: -1 };
    }
  }

  const labels = {
    docs: "newsItems",
  };
  const options = {
    page: page,
    limit: limit,
    sort: sortMethod,
    find: { is_published: 1 },
    select: {
      news_title: 1,
      published_date: 1,
      news_description_html: 1,
      _id: 0,
    },
    lean: true,
    customLabels: labels,
  };

  if (term != null) {
    return News.paginate(query, options);
  } else {
    return News.paginate({}, options);
  }
}

async function newsSearch(strSearch, limit = 5, page = 1, sort = null) {
  var query = { $text: { $search: strSearch } };

  let sortMethod = [{ _id: { order: "desc" } }];

  if (!sort) {
    sortMethod = [{ _id: { order: "desc" } }];
  } else {
    if (sort === "dateAsc") {
      sortMethod = [{ published_date_unclean: { order: "asc" } }];
    } else if (sort === "dateDesc") {
      sortMethod = [{ published_date_unclean: { order: "desc" } }];
    } else if (sort === "titleAsc") {
      sortMethod = [{ news_title: { order: "asc" } }];
    } else if (sort === "titleDesc") {
      sortMethod = [{ news_title: { order: "desc" } }];
    }
  }


  const results = await CLIENT.search({
    index: 'news',
    from: (page - 1) * limit,
    size: limit,
    body: {
      query: {
        multi_match: {
          query: strSearch || '',
          fields: ['news_title', 'news_description_html', 'news_clean_output'],  // Fields to search in
        },
      },
      sort: sortMethod,
      highlight: {
        fields: {
          news_title: {},
          news_description_html: {},
          news_clean_output: {},
        },
        pre_tags: ['<mark>'],  // Start tag for highlighting
        post_tags: ['</mark>'],  // End tag for highlighting
      },
    },
  });

  //console.log("results: ", JSON.stringify(results, null, 2));

  return {
    newsItems: results.hits.hits.map(hit => {
      // Extract the highlighted fields
      const highlighted = hit.highlight || {};
      return {
        ...hit._source,
        highlightedTitle: highlighted.news_title ? highlighted.news_title[0] : hit._source.news_title,
        highlightedDescription: highlighted.news_description_html ? highlighted.news_description_html[0] : hit._source.news_description_html,
        highlightedBody: highlighted.news_clean_output ? highlighted.news_clean_output[0] : hit._source.news_clean_output,
      };
    }),
    totalDocs: results.hits.total.value,
    totalPages: Math.ceil(results.hits.total.value / limit),
  };

}

export { ROUTER as newsRoute };
// module.exports = router;
