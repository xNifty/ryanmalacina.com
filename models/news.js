import mongoose from "mongoose";
import Joi from "joi";
import mongoosePaginate from "mongoose-paginate-v2";

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      unique: true,
      required: true,
      maxlength: 125,
    },
    // Set once at creation, for permalinks
    slug: {
      type: String,
      unique: true,
      required: true,
      maxlength: 100,
    },
    bodyMarkdown: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000,
    },
    bodyHtml: {
      type: String,
      minlength: 10,
      maxlength: 5000, // rendered HTML can be much longer than the markdown
    },
    // The body with tags stripped, for text search
    bodyText: {
      type: String,
      maxlength: 5000,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    // Restamped each time the entry is published
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

newsSchema.plugin(mongoosePaginate);

// A collection only allows one text index, so after changing this run
// `npm run sync-indexes` to swap the old one out.
newsSchema.index({ title: "text", bodyText: "text" }, { name: "news_text_search" });

// Validates the admin news form (whose field names predate the schema's)
function validateNews(form) {
  const schema = Joi.object({
    news_title: Joi.string().max(125).required(),
    news_description: Joi.string().min(10).max(1000).required(),
  });

  return schema.validate(form);
}

export { validateNews as validateNews };

export const News = mongoose.model("News", newsSchema);
