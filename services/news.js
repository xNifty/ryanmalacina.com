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

const ADMIN_FIELDS = { title: 1, slug: 1, isPublished: 1, publishedAt: 1, updatedAt: 1 };

const SORTS = {
  dateAsc: { publishedAt: 1 },
  dateDesc: { publishedAt: -1 },
  titleAsc: { title: 1 },
  titleDesc: { title: -1 },
};

const NEWEST_FIRST = { publishedAt: -1, _id: -1 };

const STATUS_FILTERS = {
  published: { isPublished: true },
  drafts: { isPublished: false },
};

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
 * @param {string} [options.term] - Search words; each must appear in the title or body
 * @returns {Promise<{ newsItems: Object[], totalPages: number, totalDocs: number }>}
 */
export function paginatePublished({ page = 1, limit = 5, sort, term } = {}) {
  const query = { isPublished: true };

  // Every word must appear in the title or body, anywhere and in any case, so partial words
  // match ("overh" finds "overhaul"). A plain scan is fine at this site's size and needs no index.
  const words = searchWords(term);
  if (words.length > 0) {
    query.$and = words.map((word) => {
      const pattern = new RegExp(escapeRegExp(word), "i");
      return { $or: [{ title: pattern }, { bodyText: pattern }] };
    });
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

/**
 * The words of a search, at most 8, each at most 50 characters, without surrounding quotes.
 * @returns {string[]}
 */
export function searchWords(term) {
  if (typeof term !== "string") return [];
  return term
    .split(/\s+/)
    .map((word) => word.replace(/^["']+|["']+$/g, "").slice(0, 50))
    .filter(Boolean)
    .slice(0, 8);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * For the admin list, most recently edited first.
 * @param {string} [status] - published | drafts; anything else lists everything
 */
export function listAll(status) {
  return News.find(STATUS_FILTERS[status] ?? {})
    .select(ADMIN_FIELDS)
    .sort({ updatedAt: -1 })
    .lean();
}

// One row of the admin list
export async function findRow(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return News.findOne({ _id: { $eq: id } }).select(ADMIN_FIELDS).lean();
}

export async function stats() {
  const [total, published] = await Promise.all([
    News.countDocuments(),
    News.countDocuments({ isPublished: true }),
  ]);
  return { total, published, drafts: total - published };
}

export function recentlyUpdated(limit = 5) {
  return News.find().select(ADMIN_FIELDS).sort({ updatedAt: -1 }).limit(limit).lean();
}

/**
 * A published entry by slug, for its public page.
 * @returns {Promise<Object|null>}
 */
export async function findPublishedBySlug(slug) {
  if (typeof slug !== "string" || slug === "") return null;
  return News.findOne({ slug: { $eq: slug }, isPublished: true })
    .select({ title: 1, slug: 1, bodyHtml: 1, publishedAt: 1, updatedAt: 1 })
    .lean();
}

/**
 * @returns {Promise<Object|null>} - The news document, or null for unknown or malformed ids
 */
export async function findById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return News.findOne({ _id: { $eq: id } });
}

function applyData(entry, data) {
  const { html, text } = renderNews(data.bodyMarkdown);
  entry.title = data.title;
  entry.bodyMarkdown = data.bodyMarkdown;
  entry.bodyHtml = html;
  entry.bodyText = text;

  // Publishing (or re-publishing) stamps the date shown on the site
  if (data.isPublished && !entry.isPublished) entry.publishedAt = new Date();
  entry.isPublished = Boolean(data.isPublished);
}

/**
 * Create an entry from validated editor data. Throws on save errors (e.g. duplicate keys).
 * @param {Object} data - title, slug (empty to generate), bodyMarkdown, isPublished
 */
export async function create(data) {
  const entry = new News({ isPublished: false });
  applyData(entry, data);
  entry.slug =
    data.slug ||
    (await uniqueSlug(slugify(data.title, "news"), (candidate) => News.exists({ slug: candidate })));
  return entry.save();
}

/**
 * Apply validated editor data to an existing entry and save it.
 * @param {Object} entry - A document from findById
 * @param {Object} data - As for create; an empty slug keeps the current one
 */
export function update(entry, data) {
  applyData(entry, data);
  if (data.slug) entry.slug = data.slug;
  return entry.save();
}

/**
 * Publishing stamps the entry with the current date.
 * @returns {Promise<Object|null>} - The updated admin row, or null if there's no such entry
 */
export async function setPublished(id, published) {
  if (!mongoose.isValidObjectId(id)) return null;

  const changes = { isPublished: published };
  if (published) changes.publishedAt = new Date();

  return News.findOneAndUpdate({ _id: { $eq: id } }, changes, {
    returnDocument: "after",
    projection: ADMIN_FIELDS,
  }).lean();
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
  findRow,
  stats,
  recentlyUpdated,
  findPublishedBySlug,
  findById,
  create,
  update,
  setPublished,
  remove,
};
