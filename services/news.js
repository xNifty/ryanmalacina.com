/*
  News data access. Routes handle HTTP; everything that reads or writes news lives here.
*/
import mongoose from "mongoose";
import dateFormat from "dateformat";

import { News } from "../models/news.js";
import { renderNews } from "./markdown.js";

const DISPLAY_DATE_FORMAT = "mmmm dd, yyyy @ h:MM TT";

const PUBLIC_FIELDS = {
  news_title: 1,
  published_date: 1,
  news_description_html: 1,
  _id: 0,
};

const SORTS = {
  dateAsc: { published_date_unclean: 1 },
  dateDesc: { published_date_unclean: -1 },
  titleAsc: { news_title: 1 },
  titleDesc: { news_title: -1 },
};

// Newest first, for the home page
export function listLatestPublished(limit = 5) {
  return News.find({ is_published: true })
    .select(PUBLIC_FIELDS)
    .sort({ _id: -1 })
    .limit(limit)
    .lean();
}

/**
 * One page of published news, optionally filtered by a text search.
 * @param {Object} options
 * @param {number} [options.page]
 * @param {number} [options.limit]
 * @param {string} [options.sort] - dateAsc | dateDesc | titleAsc | titleDesc; default newest first
 * @param {string} [options.term] - Text search on title and body
 * @param {boolean} [options.exactPhrase] - Match the term as a phrase rather than any word
 * @returns {Promise<{ newsItems: Object[], totalPages: number, totalDocs: number }>}
 */
export function paginatePublished({ page = 1, limit = 5, sort, term, exactPhrase = false } = {}) {
  const query = { is_published: true };

  if (typeof term === "string" && term.trim() !== "") {
    query.$text = { $search: exactPhrase ? `"${term.replace(/"/g, "")}"` : term };
  }

  // mongoose-paginate-v2 has no separate filter option; the filter lives in the query
  return News.paginate(query, {
    page,
    limit,
    sort: SORTS[sort] ?? { _id: -1 },
    select: PUBLIC_FIELDS,
    lean: true,
    customLabels: { docs: "newsItems" },
  });
}

// Everything, newest first, for the admin list
export function listAll() {
  return News.find().select({ news_title: 1, is_published: 1 }).sort({ _id: -1 }).lean();
}

/**
 * @returns {Promise<Object|null>} - The news document, or null for unknown or malformed ids
 */
export async function findById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return News.findOne({ _id: { $eq: id } });
}

function contentFields(title, markdown) {
  const { html, text } = renderNews(markdown);
  return {
    news_title: title,
    news_description_markdown: markdown,
    news_description_html: html,
    news_clean_output: text,
  };
}

/**
 * Create a published news entry from validated form fields. Throws on save errors.
 */
export function create(title, markdown) {
  const now = new Date();
  return new News({
    ...contentFields(title, markdown),
    published_date: dateFormat(now, DISPLAY_DATE_FORMAT),
    published_date_unclean: now,
  }).save();
}

/**
 * Update an entry's title and content. Throws on save errors.
 * @returns {Promise<boolean>} - Whether an entry with that id exists
 */
export async function update(id, title, markdown) {
  if (!mongoose.isValidObjectId(id)) return false;
  const result = await News.updateOne(
    { _id: { $eq: id } },
    contentFields(title, markdown),
    { runValidators: true }
  );
  return result.matchedCount > 0;
}

/**
 * Publishing stamps the entry with the current date (both the shown and the sortable copy).
 * @returns {Promise<boolean>} - Whether an entry with that id exists
 */
export async function setPublished(id, published) {
  if (!mongoose.isValidObjectId(id)) return false;

  const changes = { is_published: published };
  if (published) {
    const now = new Date();
    changes.published_date = dateFormat(now, DISPLAY_DATE_FORMAT);
    changes.published_date_unclean = now;
  }

  const result = await News.updateOne({ _id: { $eq: id } }, changes);
  return result.matchedCount > 0;
}

/**
 * @returns {Promise<boolean>} - Whether an entry was deleted
 */
export async function remove(id) {
  if (!mongoose.isValidObjectId(id)) return false;
  const result = await News.deleteOne({ _id: { $eq: id } });
  return result.deletedCount > 0;
}

export default {
  listLatestPublished,
  paginatePublished,
  listAll,
  findById,
  create,
  update,
  setPublished,
  remove,
};
