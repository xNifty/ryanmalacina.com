import fs from "fs";
import os from "os";
import path from "path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { testConnectOptions } from "./helpers/mongo.js";

import { Project } from "../models/projects.js";
import { News } from "../models/news.js";
import * as projects from "../services/projects.js";
import * as news from "../services/news.js";
import { migrateDataModel, parseLegacyDate } from "../scripts/lib/dataModelMigration.js";

jest.setTimeout(120000);

let mongo;
let db;
let backupDir;
const quiet = () => {};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { ...testConnectOptions, autoIndex: false });
  db = mongoose.connection.db;
});

beforeEach(async () => {
  backupDir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-test-"));
  await seedLegacyData();
});

afterEach(async () => {
  await db.dropDatabase();
  fs.rmSync(backupDir, { recursive: true, force: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const ids = {
  published: new mongoose.Types.ObjectId(),
  draft: new mongoose.Types.ObjectId(),
  newsOld: new mongoose.Types.ObjectId(),
  newsNoSortDate: new mongoose.Types.ObjectId(),
  newsHidden: new mongoose.Types.ObjectId(),
};

// Documents and indexes exactly as the old schemas stored them
async function seedLegacyData() {
  const projectsCol = db.collection("projects");
  await projectsCol.createIndex({ project_name: 1 }, { unique: true });
  await projectsCol.createIndex({ project_title: 1 }, { unique: true });
  await projectsCol.createIndex({ project_name: "text", project_title: "text" });
  await projectsCol.insertMany([
    {
      _id: ids.published,
      project_name: "Snoring Ninja",
      project_title: "Snoring Ninja Bot",
      project_source: "https://github.com/xNifty/snoring",
      project_description_markdown: "A bot that **snores** loudly.",
      project_description_html: "<p>A bot that <strong>snores</strong> loudly.</p>",
      project_image: "ninja-123.png",
      last_edited: "Tue Mar 04 2025 10:15:00 GMT-0500 (Eastern Standard Time)",
      is_published: true,
      show_index: true,
      __v: 0,
    },
    {
      _id: ids.draft,
      project_name: "Draft Thing",
      project_title: "Draft Thing Title",
      project_source: "https://example.com",
      project_description_markdown: "Not finished yet at all.",
      project_description_html: "<p>Not finished yet at all.</p>",
      is_published: false,
      show_index: false,
      __v: 0,
    },
  ]);

  const newsCol = db.collection("news");
  await newsCol.createIndex({ news_title: 1 }, { unique: true });
  await newsCol.createIndex({ news_search: "text", news_title: "text" });
  await newsCol.insertMany([
    {
      _id: ids.newsOld,
      news_title: "Site Launch",
      news_description_markdown: "The site is **live**.",
      news_description_html: "<p>The site is <strong>live</strong>.</p>",
      news_clean_output: "The site is live.\n",
      published_date: "June 10, 2026 @ 7:52 AM",
      published_date_unclean: new Date("2026-06-10T11:52:00Z"),
      is_published: true,
    },
    {
      // Older entries only had the display string
      _id: ids.newsNoSortDate,
      news_title: "Ancient Post",
      news_description_markdown: "Written before the sortable date existed.",
      news_description_html: "<p>Written before the sortable date existed.</p>",
      published_date: "March 03, 2019 @ 4:05 PM",
      is_published: true,
    },
    {
      _id: ids.newsHidden,
      news_title: "Hidden Post",
      news_description_markdown: "Nobody should see this one.",
      news_description_html: "<p>Nobody should see this one.</p>",
      news_clean_output: "Nobody should see this one.\n",
      published_date: "July 01, 2026 @ 9:00 AM",
      published_date_unclean: new Date("2026-07-01T13:00:00Z"),
      is_published: false,
    },
  ]);
}

describe("parseLegacyDate", () => {
  it("should parse both stored string formats", () => {
    expect(parseLegacyDate("March 03, 2019 @ 4:05 PM").getFullYear()).toBe(2019);
    expect(parseLegacyDate("Tue Mar 04 2025 10:15:00 GMT-0500 (Eastern Standard Time)").toISOString())
      .toBe("2025-03-04T15:15:00.000Z");
  });

  it("should return null for missing or garbage values", () => {
    expect(parseLegacyDate(undefined)).toBeNull();
    expect(parseLegacyDate("")).toBeNull();
    expect(parseLegacyDate("not a date")).toBeNull();
  });
});

describe("migrateDataModel", () => {
  it("should change nothing on a dry run", async () => {
    const before = await db.collection("projects").find().toArray();

    const summary = await migrateDataModel(db, { backupDir, log: quiet });

    expect(summary).toMatchObject({
      applied: false,
      projects: { total: 2, toMigrate: 2 },
      news: { total: 3, toMigrate: 3 },
    });
    expect(summary.indexesToDrop).toEqual(
      expect.arrayContaining(["project_name_1", "project_title_1", "news_title_1"])
    );
    expect(await db.collection("projects").find().toArray()).toEqual(before);
    expect(fs.readdirSync(backupDir)).toHaveLength(0);
  });

  it("should migrate projects to the new fields", async () => {
    await migrateDataModel(db, { apply: true, backupDir, log: quiet });

    const published = await db.collection("projects").findOne({ _id: ids.published });
    expect(published).toMatchObject({
      name: "Snoring Ninja",
      title: "Snoring Ninja Bot",
      slug: "snoring-ninja",
      source: "https://github.com/xNifty/snoring",
      descriptionMarkdown: "A bot that **snores** loudly.",
      image: "ninja-123.png",
      isPublished: true,
      featured: true,
    });
    expect(published.updatedAt.toISOString()).toBe("2025-03-04T15:15:00.000Z");
    expect(published.createdAt).toEqual(ids.published.getTimestamp());
    expect(Object.keys(published).filter((key) => key.startsWith("project_"))).toEqual([]);
    expect(published).not.toHaveProperty("show_index");
    expect(published).not.toHaveProperty("last_edited");

    const draft = await db.collection("projects").findOne({ _id: ids.draft });
    expect(draft).toMatchObject({ slug: "draft-thing", image: "default.png", isPublished: false, featured: false });
    // No last_edited: fall back to when the document was created
    expect(draft.updatedAt).toEqual(ids.draft.getTimestamp());
  });

  it("should migrate news, recovering dates and search text", async () => {
    await migrateDataModel(db, { apply: true, backupDir, log: quiet });

    const launch = await db.collection("news").findOne({ _id: ids.newsOld });
    expect(launch).toMatchObject({
      title: "Site Launch",
      slug: "site-launch",
      bodyMarkdown: "The site is **live**.",
      bodyText: "The site is live.\n",
      isPublished: true,
    });
    expect(launch.publishedAt.toISOString()).toBe("2026-06-10T11:52:00.000Z");
    expect(Object.keys(launch).filter((key) => key.startsWith("news_") || key.startsWith("published_date")))
      .toEqual([]);

    const ancient = await db.collection("news").findOne({ _id: ids.newsNoSortDate });
    expect(ancient.publishedAt.getFullYear()).toBe(2019);
    // No stored search text: rebuilt from the markdown
    expect(ancient.bodyText).toContain("Written before the sortable date existed.");

    expect((await db.collection("news").findOne({ _id: ids.newsHidden })).isPublished).toBe(false);
  });

  it("should back up everything first and drop the legacy indexes", async () => {
    const summary = await migrateDataModel(db, { apply: true, backupDir, log: quiet });

    const backup = mongoose.mongo.BSON.EJSON.parse(fs.readFileSync(summary.backupPath, "utf8"));
    expect(backup.projects).toHaveLength(2);
    expect(backup.news).toHaveLength(3);
    expect(backup.projects.find((doc) => doc.project_name === "Snoring Ninja")).toBeTruthy();

    const indexNames = (await db.collection("projects").indexes()).map((index) => index.name);
    expect(indexNames).toEqual(["_id_"]);
  });

  it("should be safe to run again", async () => {
    await migrateDataModel(db, { apply: true, backupDir, log: quiet });
    const after = await db.collection("news").find().sort({ _id: 1 }).toArray();

    const second = await migrateDataModel(db, { apply: true, backupDir, log: quiet });

    expect(second.projects.toMigrate).toBe(0);
    expect(second.news.toMigrate).toBe(0);
    expect(await db.collection("news").find().sort({ _id: 1 }).toArray()).toEqual(after);
  });

  it("should leave data the new services can use once indexes are rebuilt", async () => {
    await migrateDataModel(db, { apply: true, backupDir, log: quiet });
    await Project.syncIndexes();
    await News.syncIndexes();

    expect((await projects.findBySlug("snoring-ninja")).name).toBe("Snoring Ninja");
    expect((await projects.listFeatured()).map((p) => p.name)).toEqual(["Snoring Ninja"]);

    const page = await news.paginatePublished();
    expect(page.newsItems.map((n) => n.title)).toEqual(["Site Launch", "Ancient Post"]);

    const search = await news.paginatePublished({ term: "sortable" });
    expect(search.newsItems.map((n) => n.title)).toEqual(["Ancient Post"]);

    // Unique indexes are back
    await expect(
      projects.create({
        name: "Snoring Ninja",
        title: "Another title",
        slug: "",
        source: "https://example.com",
        descriptionMarkdown: "A description long enough to pass.",
        isPublished: false,
      })
    ).rejects.toMatchObject({ code: 11000 });
  });
});
