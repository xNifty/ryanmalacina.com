import express from 'express';
import { Project } from '../models/projects.js';
import { News } from '../models/news.js';
import mongoose from 'mongoose';
import config from 'config';
import dateFormat from 'dateformat';

const router = express.Router();

router.get("/", async (req, res) => {

    var news_list;
    var searched;

    if (req.query.search) {
        news_list = await newsSearch(req.query.search);

        searched = req.query.search;

      for (var x in news_list) {
          let counter_number = x;
          counter_number++;
          news_list[x].counter = counter_number;
          //console.log(news_list[x]);
      };
    } else {
      news_list = await listNews();

      for (var x in news_list) {
          let counter_number = x;
          counter_number++;
          news_list[x].counter = counter_number;
          //console.log(news_list[x]);
      };
    }
    return res.render("news-index", {
        title: "Ryan Malacina | News",
        news: news_list,
        searched: searched
    });
});

async function listNews() {
    return News.find({is_published: 1}).select({
        news_title: 1,
        published_date: 1,
        news_description_html: 1,
        _id: 0
    }).limit(5).sort({_id: -1}).lean();
}

async function newsSearch(strSearch) {
  var query = {$text: {$search: strSearch, $language: 'en'}};

  return News.find(query).select({
    news_title: 1,
    published_date: 1,
    news_description_html: 1,
    _id: 0
  }).sort({_id: -1}).lean();
}

export { router as newsRoute }
// module.exports = router;
