import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { Project } from "../models/projects.js";
import { News } from "../models/news.js";
import * as projects from "../services/projects.js";
import * as news from "../services/news.js";

jest.mock("../utils/errorLogging.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// The first run downloads a MongoDB binary, so allow plenty of time
jest.setTimeout(120000);

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  // Build the unique and text indexes the services rely on
  await Promise.all([Project.init(), News.init()]);
});

afterEach(async () => {
  await Promise.all([Project.deleteMany({}), News.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

function projectFields(n) {
  return {
    project_name: `Project ${n}`,
    project_title: `Title ${n}`,
    project_source: `https://example.com/${n}`,
    project_description: "A description long enough to pass validation.",
  };
}

async function createProject(n, flags = {}) {
  const project = await projects.create(projectFields(n));
  if (Object.keys(flags).length) {
    await Project.updateOne({ _id: project._id }, flags);
  }
  return project;
}

describe("projects service", () => {
  it("should create a project with rendered HTML and the default image", async () => {
    const project = await projects.create({
      ...projectFields(1),
      project_description: "Some **bold** text <script>alert(1)</script>",
    });

    expect(project.project_image).toBe("default.png");
    expect(project.is_published).toBe(false);
    expect(project.project_description_html).toContain("<strong>bold</strong>");
    expect(project.project_description_html).not.toContain("<script>");
  });

  it("should reject duplicate names", async () => {
    await createProject(1);
    await expect(projects.create(projectFields(1))).rejects.toMatchObject({ code: 11000 });
  });

  it("should only list and count published projects, and only feature published ones", async () => {
    await createProject(1, { is_published: true, show_index: true });
    await createProject(2, { is_published: true });
    await createProject(3, { show_index: true });

    const published = await projects.listPublished();
    expect(published.map((p) => p.project_name).sort()).toEqual(["Project 1", "Project 2"]);
    expect(await projects.countPublished()).toBe(2);
    expect((await projects.listFeatured()).map((p) => p.project_name)).toEqual(["Project 1"]);
    expect(await projects.listAll()).toHaveLength(3);
  });

  it("should publish and unpublish, reporting unknown or malformed ids", async () => {
    const project = await createProject(1);

    expect(await projects.setPublished(project._id.toString(), true)).toBe(true);
    expect((await Project.findById(project._id)).is_published).toBe(true);

    expect(await projects.setPublished(new mongoose.Types.ObjectId().toString(), true)).toBe(false);
    expect(await projects.setPublished("not-an-id", true)).toBe(false);
  });

  it("should feature up to the limit, then refuse, and unfeature", async () => {
    const created = [];
    for (let n = 1; n <= projects.FEATURED_LIMIT + 1; n++) {
      created.push(await createProject(n));
    }

    for (const project of created.slice(0, projects.FEATURED_LIMIT)) {
      expect(await projects.toggleFeatured(project._id.toString())).toBe("featured");
    }
    expect(await projects.toggleFeatured(created.at(-1)._id.toString())).toBe("limit");
    expect(await projects.toggleFeatured(created[0]._id.toString())).toBe("unfeatured");
    expect(await projects.toggleFeatured(created.at(-1)._id.toString())).toBe("featured");
    expect(await projects.toggleFeatured("not-an-id")).toBe("notFound");
  });

  it("should update fields, keep the image unless given one, and stamp last_edited", async () => {
    const project = await createProject(1);

    await projects.update(project, { ...projectFields(1), project_title: "Renamed" });
    let saved = await Project.findById(project._id);
    expect(saved.project_title).toBe("Renamed");
    expect(saved.project_image).toBe("default.png");
    expect(saved.last_edited).toBeTruthy();

    await projects.update(saved, projectFields(1), "new-image.png");
    saved = await Project.findById(project._id);
    expect(saved.project_image).toBe("new-image.png");
  });

  it("should find by id and treat malformed ids as not found", async () => {
    const project = await createProject(1);
    expect((await projects.findById(project._id.toString())).project_name).toBe("Project 1");
    expect(await projects.findById("not-an-id")).toBeNull();
    expect(await projects.findById(new mongoose.Types.ObjectId().toString())).toBeNull();
  });

  it("should remove projects", async () => {
    const project = await createProject(1);
    expect(await projects.remove(project._id.toString())).toBe(true);
    expect(await projects.remove(project._id.toString())).toBe(false);
    expect(await projects.remove("not-an-id")).toBe(false);
  });
});

describe("news service", () => {
  it("should create a published entry with HTML, search text and dates", async () => {
    const entry = await news.create("Hello", "Some **news** here");

    expect(entry.is_published).toBe(true);
    expect(entry.news_description_html).toContain("<strong>news</strong>");
    expect(entry.news_clean_output).toBe("Some news here\n");
    expect(entry.published_date).toMatch(/\d{4} @ /);
    expect(entry.published_date_unclean).toBeInstanceOf(Date);
  });

  it("should never return unpublished entries from the public listings", async () => {
    await news.create("Visible", "Published entry body");
    const hidden = await news.create("Hidden", "Unpublished entry body");
    await news.setPublished(hidden._id.toString(), false);

    const page = await news.paginatePublished();
    expect(page.newsItems.map((n) => n.news_title)).toEqual(["Visible"]);
    expect(page.totalDocs).toBe(1);

    const search = await news.paginatePublished({ term: "entry" });
    expect(search.newsItems.map((n) => n.news_title)).toEqual(["Visible"]);

    expect((await news.listLatestPublished()).map((n) => n.news_title)).toEqual(["Visible"]);
    expect(await news.listAll()).toHaveLength(2);
  });

  it("should paginate newest first by default and support sorting", async () => {
    for (const title of ["Bravo", "Alpha", "Charlie"]) {
      await news.create(title, "A news body for sorting");
    }

    const newest = await news.paginatePublished({ limit: 2 });
    expect(newest.newsItems.map((n) => n.news_title)).toEqual(["Charlie", "Alpha"]);
    expect(newest.totalPages).toBe(2);

    const byTitle = await news.paginatePublished({ sort: "titleAsc" });
    expect(byTitle.newsItems.map((n) => n.news_title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("should search title and body, with an exact-phrase option", async () => {
    await news.create("Deploy notes", "The server moved to a new host today");
    await news.create("Unrelated", "Nothing about servers or hosts here at all");

    const anyWord = await news.paginatePublished({ term: "host" });
    expect(anyWord.totalDocs).toBe(2);

    const phrase = await news.paginatePublished({ term: "new host", exactPhrase: true });
    expect(phrase.newsItems.map((n) => n.news_title)).toEqual(["Deploy notes"]);
  });

  it("should update content and report unknown ids", async () => {
    const entry = await news.create("Original", "Original body text");

    expect(await news.update(entry._id.toString(), "Edited", "Edited *body* text")).toBe(true);
    const saved = await News.findById(entry._id);
    expect(saved.news_title).toBe("Edited");
    expect(saved.news_description_html).toContain("<em>body</em>");
    expect(saved.news_clean_output).toContain("Edited body text");

    expect(await news.update(new mongoose.Types.ObjectId().toString(), "x", "Some body text")).toBe(false);
    expect(await news.update("not-an-id", "x", "Some body text")).toBe(false);
  });

  it("should restamp the shown date when publishing", async () => {
    const entry = await news.create("Dated", "A body with a date");
    await News.updateOne(
      { _id: entry._id },
      { published_date: "January 01, 2020 @ 1:00 AM", published_date_unclean: new Date("2020-01-01") }
    );

    await news.setPublished(entry._id.toString(), true);
    const saved = await News.findById(entry._id);
    expect(saved.published_date).not.toBe("January 01, 2020 @ 1:00 AM");
    expect(saved.published_date_unclean.getFullYear()).toBeGreaterThan(2020);
  });

  it("should remove entries", async () => {
    const entry = await news.create("Doomed", "This one gets deleted");
    expect(await news.remove(entry._id.toString())).toBe(true);
    expect(await news.remove(entry._id.toString())).toBe(false);
  });
});
