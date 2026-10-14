import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      unique: true,
      required: true,
      maxlength: 125,
    },
    // For permalinks. Generated from the title unless set in the editor
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
    // Rendered from bodyMarkdown, so their size is bounded by that limit
    bodyHtml: {
      type: String,
    },
    // The body with tags stripped, for text search
    bodyText: {
      type: String,
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

// Search scans title and bodyText directly (services/news.js), so there's no text index;
// `npm run sync-indexes` drops the one earlier versions created.

export const News = mongoose.model("News", newsSchema);
