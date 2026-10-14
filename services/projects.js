/*
  Project data access. Routes handle HTTP; everything that reads or writes projects lives here.
*/
import mongoose from "mongoose";

import { Project } from "../models/projects.js";
import { renderProjectHtml } from "./markdown.js";
import { slugify, uniqueSlug } from "../utils/slug.js";

// How many projects can be featured on the home page
export const FEATURED_LIMIT = 3;

const CARD_FIELDS = { name: 1, title: 1, slug: 1, image: 1 };

export function listPublished() {
  return Project.find({ isPublished: true }).select(CARD_FIELDS).lean();
}

export function listFeatured() {
  return Project.find({ isPublished: true, featured: true }).select(CARD_FIELDS).lean();
}

export function countPublished() {
  return Project.countDocuments({ isPublished: true });
}

// Everything, for the admin list
export function listAll() {
  return Project.find()
    .select({ ...CARD_FIELDS, isPublished: 1, featured: 1 })
    .lean();
}

/**
 * @returns {Promise<Object|null>} - The project document, or null for unknown or malformed ids
 */
export async function findById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Project.findOne({ _id: { $eq: id } });
}

/**
 * @returns {Promise<Object|null>} - The project document with that slug
 */
export async function findBySlug(slug) {
  if (typeof slug !== "string" || slug === "") return null;
  return Project.findOne({ slug: { $eq: slug } });
}

/**
 * Map the admin form's field names onto the schema.
 * @param {Object} form - project_name, project_title, project_source, project_description
 */
function applyForm(project, form) {
  project.name = form.project_name;
  project.title = form.project_title;
  project.source = form.project_source;
  project.descriptionMarkdown = form.project_description;
  project.descriptionHtml = renderProjectHtml(form.project_description);
}

/**
 * Create a project from the validated admin form. Throws on save errors (e.g. duplicate keys).
 * @param {Object} form - As for applyForm
 * @param {string} [imageFileName] - An already-validated upload name; defaults to default.png
 */
export async function create(form, imageFileName) {
  const project = new Project();
  applyForm(project, form);
  project.slug = await uniqueSlug(slugify(form.project_name, "project"), (candidate) =>
    Project.exists({ slug: candidate })
  );
  if (imageFileName) project.image = imageFileName;
  return project.save();
}

/**
 * Apply the validated admin form to an existing project and save it. The slug is kept.
 * @param {Object} project - A document from findById
 * @param {Object} form - As for applyForm
 * @param {string} [imageFileName] - A new image, or omit to keep the current one
 */
export function update(project, form, imageFileName) {
  applyForm(project, form);
  if (imageFileName) project.image = imageFileName;
  return project.save();
}

/**
 * @returns {Promise<boolean>} - Whether a project with that id exists
 */
export async function setPublished(id, published) {
  if (!mongoose.isValidObjectId(id)) return false;
  const result = await Project.updateOne({ _id: { $eq: id } }, { isPublished: published });
  return result.matchedCount > 0;
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
  findById,
  findBySlug,
  create,
  update,
  setPublished,
  toggleFeatured,
  remove,
};
