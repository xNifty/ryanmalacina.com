import mongoose from "mongoose";
import Joi from "@hapi/joi";
import mongoosePaginate from "mongoose-paginate-v2";
import { getClient } from "../utils/elastic.js";
import "dotenv/config";

const newsScheme = new mongoose.Schema({
  news_title: {
    type: String,
    unique: true,
    required: true,
    maxlength: 125,
  },
  news_description_markdown: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1000,
  },
  news_description_html: {
    type: String,
    minlength: 10,
    maxlength: 5000, // rendered HTML can be much longer than the markdown
  },
  published_date: {
    type: String,
  },
  last_edited: {
    type: String,
  },
  is_published: {
    type: Boolean,
    default: true,
  },
  news_clean_output: {
    type: String,
    minlength: 10,
    maxlength: 5000,
  },
  published_date_unclean: {
    type: Date,
  },
});

const USE_ELASTIC = process.env.useElastic;

newsScheme.plugin(mongoosePaginate);

// const News = mongoose.model('News', newsScheme);

if (USE_ELASTIC === "true") {
  async function indexNewsToElasticsearch(news) {
    await getClient().index({
      index: "news",
      id: news._id.toString(),
      body: {
        news_title: news.news_title,
        news_description_html: news.news_description_html,
        published_date: news.published_date,
        published_date_unclean: news.published_date_unclean,
        news_clean_output: news.news_clean_output,
      },
    });
  }

  newsScheme.post("save", async function (doc) {
    await indexNewsToElasticsearch(doc);
  });

  newsScheme.post("findOneAndUpdate", async function (doc) {
    await indexNewsToElasticsearch(doc);
  });
} else {
  newsScheme.index({ news_search: "text", news_title: "text" });
}

function validateNews(user) {
  const schema = Joi.object({
    news_title: Joi.string().max(125).required(),
    news_description: Joi.string().min(10).max(1000).required(),
  });

  return schema.validate(user);
}

// exports.validateNews = validateNews;

export { validateNews as validateNews };

export const News = mongoose.model("News", newsScheme);
