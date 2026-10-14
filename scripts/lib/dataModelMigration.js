/*
  Data model migration (October 2026, phase 2 of the overhaul).

  Projects: project_name/_title/_source/_description_markdown/_description_html/_image
            -> name/title/source/descriptionMarkdown/descriptionHtml/image;
            is_published/show_index -> isPublished/featured;
            last_edited (a string) -> updatedAt; adds slug and createdAt.
  News:     news_title/_description_markdown/_description_html/news_clean_output
            -> title/bodyMarkdown/bodyHtml/bodyText; is_published -> isPublished;
            published_date (a string) + published_date_unclean -> publishedAt;
            adds slug, createdAt and updatedAt.

  Documents already in the new shape are skipped, so running it twice is safe.
  Unique and text indexes on the old field names are dropped before the rename, since
  documents losing project_name would otherwise collide on null. Build the new indexes
  afterwards with Model.syncIndexes() (the CLI does this).
*/
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

import { slugify } from "../../utils/slug.js";
import { renderNews } from "../../services/markdown.js";

const { EJSON } = mongoose.mongo.BSON;

export const LEGACY_PROJECT_FIELDS = [
  "project_name",
  "project_title",
  "project_source",
  "project_description_markdown",
  "project_description_html",
  "project_image",
  "is_published",
  "show_index",
  "last_edited",
];

export const LEGACY_NEWS_FIELDS = [
  "news_title",
  "news_description_markdown",
  "news_description_html",
  "news_clean_output",
  "is_published",
  "published_date",
  "published_date_unclean",
  "last_edited",
  "news_search",
];

/**
 * Parse the dates the old schema stored as strings:
 * "October 14, 2026 @ 3:05 PM" (news) or Date#toString() output (project last_edited).
 * @returns {Date|null}
 */
export function parseLegacyDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = new Date(value.replace(" @ ", " "));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function createdAtOf(doc) {
  return typeof doc._id?.getTimestamp === "function" ? doc._id.getTimestamp() : new Date();
}

function hasLegacyFields(doc, fields) {
  return fields.some((field) => field in doc);
}

function allocateSlug(text, fallback, taken) {
  const base = slugify(text, fallback);
  let candidate = base;
  for (let n = 2; taken.has(candidate); n++) {
    candidate = `${base}-${n}`;
  }
  taken.add(candidate);
  return candidate;
}

function unsetAll(fields, doc) {
  return Object.fromEntries(fields.filter((field) => field in doc).map((field) => [field, ""]));
}

/**
 * @returns {{ _id, label: string, set: Object, unset: Object }}
 */
export function planProject(doc, takenSlugs) {
  const createdAt = createdAtOf(doc);
  const set = {
    name: doc.project_name,
    title: doc.project_title,
    slug: doc.slug ?? allocateSlug(doc.project_name ?? doc.project_title, "project", takenSlugs),
    source: doc.project_source,
    descriptionMarkdown: doc.project_description_markdown,
    descriptionHtml: doc.project_description_html,
    image: doc.project_image || "default.png",
    isPublished: Boolean(doc.is_published),
    featured: Boolean(doc.show_index),
    createdAt: doc.createdAt ?? createdAt,
    updatedAt: parseLegacyDate(doc.last_edited) ?? createdAt,
  };

  return {
    _id: doc._id,
    label: doc.project_name ?? String(doc._id),
    set,
    unset: unsetAll(LEGACY_PROJECT_FIELDS, doc),
  };
}

/**
 * @returns {{ _id, label: string, set: Object, unset: Object }}
 */
export function planNews(doc, takenSlugs) {
  const createdAt = createdAtOf(doc);
  const publishedAt =
    parseLegacyDate(doc.published_date_unclean) ?? parseLegacyDate(doc.published_date) ?? createdAt;

  const set = {
    title: doc.news_title,
    slug: doc.slug ?? allocateSlug(doc.news_title, "news", takenSlugs),
    bodyMarkdown: doc.news_description_markdown,
    bodyHtml: doc.news_description_html,
    bodyText:
      doc.news_clean_output ??
      (doc.news_description_markdown ? renderNews(doc.news_description_markdown).text : undefined),
    // The old schema defaulted news to published
    isPublished: doc.is_published ?? true,
    publishedAt,
    createdAt: doc.createdAt ?? createdAt,
    updatedAt: publishedAt,
  };

  for (const key of Object.keys(set)) {
    if (set[key] === undefined) delete set[key];
  }

  return {
    _id: doc._id,
    label: doc.news_title ?? String(doc._id),
    set,
    unset: unsetAll(LEGACY_NEWS_FIELDS, doc),
  };
}

/**
 * Indexes whose keys (or text-index weights) name a legacy field.
 */
async function legacyIndexes(collection, legacyFields) {
  const indexes = await collection.indexes();
  return indexes.filter((index) => {
    if (index.name === "_id_") return false;
    const fields = [...Object.keys(index.key ?? {}), ...Object.keys(index.weights ?? {})];
    return fields.some((field) => legacyFields.includes(field));
  });
}

function describeDate(value) {
  return value instanceof Date ? value.toISOString() : String(value);
}

/**
 * Plan the migration and, with apply: true, back up both collections, drop legacy indexes
 * and rewrite the documents.
 * @param {Object} db - A connected MongoDB Db (mongoose.connection.db)
 * @param {Object} options
 * @param {boolean} [options.apply] - Write changes; otherwise only report them
 * @param {string} [options.backupDir] - Where to write the JSON backup before applying
 * @param {Function} [options.log]
 * @param {string} [options.projectsCollection]
 * @param {string} [options.newsCollection]
 * @returns {Promise<Object>} - Counts and, when applied, the backup path
 */
export async function migrateDataModel(
  db,
  {
    apply = false,
    backupDir = "backups",
    log = console.log,
    projectsCollection = "projects",
    newsCollection = "news",
  } = {}
) {
  const collections = {
    projects: db.collection(projectsCollection),
    news: db.collection(newsCollection),
  };

  const projectDocs = await collections.projects.find({}).toArray();
  const newsDocs = await collections.news.find({}).toArray();

  const projectSlugs = new Set(projectDocs.map((doc) => doc.slug).filter(Boolean));
  const newsSlugs = new Set(newsDocs.map((doc) => doc.slug).filter(Boolean));

  const plans = {
    projects: projectDocs
      .filter((doc) => hasLegacyFields(doc, LEGACY_PROJECT_FIELDS))
      .map((doc) => planProject(doc, projectSlugs)),
    news: newsDocs
      .filter((doc) => hasLegacyFields(doc, LEGACY_NEWS_FIELDS))
      .map((doc) => planNews(doc, newsSlugs)),
  };

  const indexes = {
    projects: await legacyIndexes(collections.projects, LEGACY_PROJECT_FIELDS),
    news: await legacyIndexes(collections.news, LEGACY_NEWS_FIELDS),
  };

  const summary = {
    projects: { total: projectDocs.length, toMigrate: plans.projects.length },
    news: { total: newsDocs.length, toMigrate: plans.news.length },
    indexesToDrop: [...indexes.projects, ...indexes.news].map((index) => index.name),
    applied: false,
  };

  log(`Projects: ${summary.projects.toMigrate} of ${summary.projects.total} need migrating`);
  for (const plan of plans.projects) {
    log(
      `  ${plan._id}  "${plan.label}" -> /projects/${plan.set.slug}` +
        `  published=${plan.set.isPublished} featured=${plan.set.featured}` +
        `  updatedAt=${describeDate(plan.set.updatedAt)}`
    );
  }

  log(`News: ${summary.news.toMigrate} of ${summary.news.total} need migrating`);
  for (const plan of plans.news) {
    log(
      `  ${plan._id}  "${plan.label}" -> slug ${plan.set.slug}` +
        `  published=${plan.set.isPublished}  publishedAt=${describeDate(plan.set.publishedAt)}`
    );
  }

  log(
    summary.indexesToDrop.length
      ? `Indexes to drop (rebuilt afterwards): ${summary.indexesToDrop.join(", ")}`
      : "No legacy indexes to drop"
  );

  if (!apply) {
    log("Dry run: nothing was written. Re-run with --apply to migrate.");
    return summary;
  }

  if (plans.projects.length === 0 && plans.news.length === 0 && summary.indexesToDrop.length === 0) {
    log("Nothing to do.");
    return { ...summary, applied: true };
  }

  // Back up both collections in full before touching anything
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `data-model-migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(
    backupPath,
    EJSON.stringify({ projects: projectDocs, news: newsDocs }, { relaxed: false }, 2)
  );
  log(`Backup written to ${backupPath}`);

  for (const [name, list] of Object.entries(indexes)) {
    for (const index of list) {
      await collections[name].dropIndex(index.name);
      log(`Dropped index ${name}.${index.name}`);
    }
  }

  for (const [name, list] of Object.entries(plans)) {
    if (list.length === 0) continue;
    const result = await collections[name].bulkWrite(
      list.map((plan) => ({
        updateOne: {
          filter: { _id: plan._id },
          update: Object.keys(plan.unset).length
            ? { $set: plan.set, $unset: plan.unset }
            : { $set: plan.set },
        },
      }))
    );
    log(`Migrated ${result.modifiedCount} ${name} document(s)`);
  }

  return { ...summary, applied: true, backupPath };
}

export default { migrateDataModel, planProject, planNews, parseLegacyDate };
