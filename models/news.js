import mongoose from "mongoose";
import Joi from "joi";
import mongoosePaginate from "mongoose-paginate-v2";

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

newsScheme.plugin(mongoosePaginate);

// news_clean_output is the post body with tags stripped. A collection only allows one
// text index, so after changing this run `npm run sync-indexes` to swap the old one out.
newsScheme.index(
  { news_title: "text", news_clean_output: "text" },
  { name: "news_text_search" }
);

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
