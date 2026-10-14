/*
  News data access. Routes handle HTTP; everything that reads or writes news lives here.
*/
import mongoose from "mongoose";

import { News } from "../models/news.js";
import { renderNews } from "./markdown.js";
import { slugify, uniqueSlug } from "../utils/slug.js";

const PUBLIC_FIELDS = {
  title: 1,
  slug: 1,
  bodyHtml: 1,
  publishedAt: 1,
  _id: 0,
};

const SORTS = {
  dateAsc: { publishedAt: 1 },
  dateDesc: { publishedAt: -1 },
  titleAsc: { title: 1 },
  titleDesc: { title: -1 },
};

const NEWEST_FIRST = { publishedAt: -1, _id: -1 };

// Newest first, for the home page
export function listLatestPublished(limit = 5) {
  return News.find({ isPublished: true })
    .select(PUBLIC_FIELDS)
    .sort(NEWEST_FIRST)
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
  const query = { isPublished: true };

  if (typeof term === "string" && term.trim() !== "") {
    query.$text = { $search: exactPhrase ? `"${term.replace(/"/g, "")}"` : term };
  }

  // mongoose-paginate-v2 has no separate filter option; the filter lives in the query
  return News.paginate(query, {
    page,
    limit,
    sort: SORTS[sort] ?? NEWEST_FIRST,
    select: PUBLIC_FIELDS,
    lean: true,
    customLabels: { docs: "newsItems" },
  });
}

// Everything, newest first, for the admin list
export function listAll() {
  return News.find().select({ title: 1, isPublished: 1 }).sort(NEWEST_FIRST).lean();
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
    title,
    bodyMarkdown: markdown,
    bodyHtml: html,
    bodyText: text,
  };
}

/**
 * Create a published news entry from validated form fields. Throws on save errors.
 */
export async function create(title, markdown) {
  const slug = await uniqueSlug(slugify(title, "news"), (candidate) =>
    News.exists({ slug: candidate })
  );
  return new News({ ...contentFields(title, markdown), slug, publishedAt: new Date() }).save();
}

/**
 * Update an entry's title and content. The slug is kept. Throws on save errors.
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
 * Publishing stamps the entry with the current date.
 * @returns {Promise<boolean>} - Whether an entry with that id exists
 */
export async function setPublished(id, published) {
  if (!mongoose.isValidObjectId(id)) return false;

  const changes = { isPublished: published };
  if (published) changes.publishedAt = new Date();

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
