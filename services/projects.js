/*
  Project data access. Routes handle HTTP; everything that reads or writes projects lives here.
*/
import mongoose from "mongoose";

import { Project } from "../models/projects.js";
import { renderProjectHtml } from "./markdown.js";
import { slugify, uniqueSlug } from "../utils/slug.js";

// How many projects can be featured on the home page
export const FEATURED_LIMIT = 3;

const CARD_FIELDS = { name: 1, title: 1, slug: 1, image: 1, tags: 1 };
const ADMIN_FIELDS = { ...CARD_FIELDS, isPublished: 1, featured: 1, updatedAt: 1 };

const STATUS_FILTERS = {
  published: { isPublished: true },
  drafts: { isPublished: false },
  featured: { featured: true },
};

export function listPublished() {
  return Project.find({ isPublished: true }).select(CARD_FIELDS).lean();
}

export function listFeatured() {
  return Project.find({ isPublished: true, featured: true }).select(CARD_FIELDS).lean();
}

export function countPublished() {
  return Project.countDocuments({ isPublished: true });
}

/**
 * For the admin list, most recently edited first.
 * @param {string} [status] - published | drafts | featured; anything else lists everything
 */
export function listAll(status) {
  return Project.find(STATUS_FILTERS[status] ?? {})
    .select(ADMIN_FIELDS)
    .sort({ updatedAt: -1 })
    .lean();
}

// One row of the admin list
export async function findRow(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Project.findOne({ _id: { $eq: id } }).select(ADMIN_FIELDS).lean();
}

export async function stats() {
  const [total, published, featured] = await Promise.all([
    Project.countDocuments(),
    Project.countDocuments({ isPublished: true }),
    Project.countDocuments({ featured: true }),
  ]);
  return { total, published, drafts: total - published, featured };
}

export function recentlyUpdated(limit = 5) {
  return Project.find().select(ADMIN_FIELDS).sort({ updatedAt: -1 }).limit(limit).lean();
}

/**
 * @returns {Promise<Object|null>} - The project document, or null for unknown or malformed ids
 */
export async function findById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Project.findOne({ _id: { $eq: id } });
}

/**
 * Find by current slug, falling back to slugs it had before a rename. Callers can compare
 * project.slug to what they asked for and redirect.
 * @returns {Promise<Object|null>}
 */
export async function findBySlug(slug) {
  if (typeof slug !== "string" || slug === "") return null;
  return (
    (await Project.findOne({ slug: { $eq: slug } })) ??
    (await Project.findOne({ previousSlugs: { $eq: slug } }))
  );
}

function applyData(project, data) {
  project.name = data.name;
  project.title = data.title;
  project.source = data.source;
  project.descriptionMarkdown = data.descriptionMarkdown;
  project.descriptionHtml = renderProjectHtml(data.descriptionMarkdown);
  project.tags = data.tags ?? [];
  project.isPublished = Boolean(data.isPublished);
}

/**
 * Create a project from validated editor data. Throws on save errors (e.g. duplicate keys).
 * @param {Object} data - name, title, slug (empty to generate), source, descriptionMarkdown, isPublished
 * @param {string} [imageFileName] - An already-validated upload; defaults to default.png
 */
export async function create(data, imageFileName) {
  const project = new Project();
  applyData(project, data);
  project.slug =
    data.slug ||
    (await uniqueSlug(slugify(data.name, "project"), (candidate) => Project.exists({ slug: candidate })));
  if (imageFileName) project.image = imageFileName;
  return project.save();
}

/**
 * Apply validated editor data to an existing project and save it. A changed slug keeps the
 * old one in previousSlugs so existing links redirect.
 * @param {Object} project - A document from findById
 * @param {Object} data - As for create; an empty slug keeps the current one
 * @param {string} [imageFileName] - A new image, or omit to keep the current one
 */
export function update(project, data, imageFileName) {
  applyData(project, data);

  if (data.slug && data.slug !== project.slug) {
    project.previousSlugs = [...new Set([...project.previousSlugs, project.slug])].filter(
      (slug) => slug !== data.slug
    );
    project.slug = data.slug;
  }

  if (imageFileName) project.image = imageFileName;
  return project.save();
}

/**
 * @returns {Promise<Object|null>} - The updated admin row, or null if there's no such project
 */
export async function setPublished(id, published) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Project.findOneAndUpdate(
    { _id: { $eq: id } },
    { isPublished: published },
    { returnDocument: "after", projection: ADMIN_FIELDS }
  ).lean();
}

/**
 * Flip whether a project is featured on the home page.
 * @returns {Promise<"featured"|"unfeatured"|"limit"|"notFound">}
 */
export async function toggleFeatured(id) {
  const project = await findById(id);
  if (!project) return "notFound";

  // updateOne rather than save(), so an older document that predates a schema limit
  // can still be toggled
  if (project.featured) {
    await Project.updateOne({ _id: project._id }, { featured: false });
    return "unfeatured";
  }

  if ((await Project.countDocuments({ featured: true })) >= FEATURED_LIMIT) {
    return "limit";
  }

  await Project.updateOne({ _id: project._id }, { featured: true });
  return "featured";
}

/**
 * @returns {Promise<boolean>} - Whether a project was deleted
 */
export async function remove(id) {
  if (!mongoose.isValidObjectId(id)) return false;
  const result = await Project.deleteOne({ _id: { $eq: id } });
  return result.deletedCount > 0;
}

export default {
  FEATURED_LIMIT,
  listPublished,
  listFeatured,
  countPublished,
  listAll,
  findRow,
  stats,
  recentlyUpdated,
  findById,
  findBySlug,
  create,
  update,
  setPublished,
  toggleFeatured,
  remove,
};
