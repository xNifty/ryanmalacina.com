/*
  Project data access. Routes handle HTTP; everything that reads or writes projects lives here.
*/
import mongoose from "mongoose";

import { Project } from "../models/projects.js";
import { renderProjectHtml } from "./markdown.js";

// How many projects can be featured on the home page
export const FEATURED_LIMIT = 3;

const CARD_FIELDS = { project_name: 1, project_image: 1, project_title: 1 };

export function listPublished() {
  return Project.find({ is_published: true }).select(CARD_FIELDS).lean();
}

export function listFeatured() {
  return Project.find({ is_published: true, show_index: true }).select(CARD_FIELDS).lean();
}

export function countPublished() {
  return Project.countDocuments({ is_published: true });
}

// Everything, for the admin list
export function listAll() {
  return Project.find()
    .select({ ...CARD_FIELDS, is_published: 1, show_index: 1 })
    .lean();
}

/**
 * @returns {Promise<Object|null>} - The project document, or null for unknown or malformed ids
 */
export async function findById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Project.findOne({ _id: { $eq: id } });
}

function applyFields(project, fields) {
  project.project_name = fields.project_name;
  project.project_title = fields.project_title;
  project.project_source = fields.project_source;
  project.project_description_markdown = fields.project_description;
  project.project_description_html = renderProjectHtml(fields.project_description);
}

/**
 * Create a project from validated form fields. Throws on save errors (e.g. duplicate keys).
 * @param {Object} fields - project_name, project_title, project_source, project_description
 * @param {string} [imageFileName] - An already-validated upload name; defaults to default.png
 */
export function create(fields, imageFileName) {
  const project = new Project();
  applyFields(project, fields);
  project.project_image = imageFileName || "default.png";
  return project.save();
}

/**
 * Apply validated form fields to an existing project document and save it.
 * @param {Object} project - A document from findById
 * @param {Object} fields - As for create
 * @param {string} [imageFileName] - A new image, or omit to keep the current one
 */
export function update(project, fields, imageFileName) {
  applyFields(project, fields);
  if (imageFileName) project.project_image = imageFileName;
  project.last_edited = new Date();
  return project.save();
}

/**
 * @returns {Promise<boolean>} - Whether a project with that id exists
 */
export async function setPublished(id, published) {
  if (!mongoose.isValidObjectId(id)) return false;
  const result = await Project.updateOne({ _id: { $eq: id } }, { is_published: published });
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
  if (project.show_index) {
    await Project.updateOne({ _id: project._id }, { show_index: false });
    return "unfeatured";
  }

  if ((await Project.countDocuments({ show_index: true })) >= FEATURED_LIMIT) {
    return "limit";
  }

  await Project.updateOne({ _id: project._id }, { show_index: true });
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
  create,
  update,
  setPublished,
  toggleFeatured,
  remove,
};
