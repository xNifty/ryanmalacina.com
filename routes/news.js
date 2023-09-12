import express from 'express';
import { News } from '../models/news.js';
import paginate from 'mongoose-paginate-v2';

const router = express.Router();

router.get("/", async (req, res) => {
  var news_list;

  let page = req.query.page;
  let term = req.query.term;

  if (page == undefined) {
    page = 1;
  }

  news_list = await listNews(5, page, term);

  for (var x in news_list['newsItems']) {
    let counter_number = x;
    counter_number++;
    news_list['newsItems'][x].counter = counter_number;
  };

  return res.render("news-index", {
    layout: 'newsIndex',
    title: "Ryan Malacina | News",
    news: news_list['newsItems'],
    totalPages: news_list['totalPages'],
    totalItems: news_list['totalDocs'],
    currentPage: page
  });
});

router.post("/", async (req, res) => {
  var news_list;

  let page = req.query.page;
  let term = req.query.term;

  if (page == undefined) {
    page = 1;
  }

  if (req.body.search) {
    news_list = await newsSearch(req.body.search, 5, 1);
  } else {
    news_list = await listNews(5, page, term);
  }

  for (var x in news_list['newsItems']) {
    let counter_number = x;
    counter_number++;
    news_list['newsItems'][x].counter = counter_number;
  };
  return res.render("partials/news/news-display", {
    layout: false,
    news: news_list['newsItems'],
    totalPages: news_list['totalPages'],
    totalItems: news_list['totalDocs'],
    currentPage: page
  });
});

router.post("/search", async (req, res) => {
  var news_list;
  var search = false;
  var term;

  let page = req.query.page;
  if (page == undefined) {
    page = 1;
  }

  if (req.body.search) {
    news_list = await newsSearch(req.body.search, 5, 1);
    const addQuery = (req, res, next) => {
      req.query.term      = req.body.search;
      next();
    }
    search = true;
    term = req.body.search;
  } else {
    news_list = await listNews(5, page);
  }

  for (var x in news_list['newsItems']) {
    let counter_number = x;
    counter_number++;
    news_list['newsItems'][x].counter = counter_number;
  };

  return res.render("partials/news/news-display", {
    layout: false,
    news: news_list['newsItems'],
    totalPages: news_list['totalPages'],
    totalItems: news_list['totalDocs'],
    currentPage: 1,
    search: search,
    searchTerm: term
  });
});

async function listNews(limit = 5, page = 1, term = null) {
  var query = {$text: {$search: term}};

  const labels = {
    docs: 'newsItems',
  }
  const options = {
    page: page,
    limit: limit,
    sort: {_id: -1},
    find: {is_published: 1},
    select: {news_title: 1, published_date: 1, news_description_html: 1, _id: 0},
    lean: true,
    customLabels: labels
  };

  if (term != null) {
    return News.paginate(query, options);
  } else {
    return News.paginate({}, options);
  }

}

async function newsSearch(strSearch, limit = 5, page = 1, term = null) {
  var query = {$text: {$search: strSearch}};

  const labels = {
    docs: 'newsItems',
  }
  const options = {
    page: page,
    limit: limit,
    sort: {_id: -1},
    find: {is_published: 1},
    select: {news_title: 1, published_date: 1, news_description_html: 1, _id: 0},
    lean: true,
    customLabels: labels
  };

  return News.paginate(query, options);
}

export { router as newsRoute }
// module.exports = router;
