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

// The admin form's field names
function projectForm(n) {
  return {
    project_name: `Project ${n}`,
    project_title: `Title ${n}`,
    project_source: `https://example.com/${n}`,
    project_description: "A description long enough to pass validation.",
  };
}

async function createProject(n, flags = {}) {
  const project = await projects.create(projectForm(n));
  if (Object.keys(flags).length) {
    await Project.updateOne({ _id: project._id }, flags);
  }
  return project;
}

describe("projects service", () => {
  it("should create a project with rendered HTML, a slug and the default image", async () => {
    const project = await projects.create({
      ...projectForm(1),
      project_name: "My Cool Project!",
      project_description: "Some **bold** text <script>alert(1)</script>",
    });

    expect(project.name).toBe("My Cool Project!");
    expect(project.slug).toBe("my-cool-project");
    expect(project.image).toBe("default.png");
    expect(project.isPublished).toBe(false);
    expect(project.createdAt).toBeInstanceOf(Date);
    expect(project.descriptionHtml).toContain("<strong>bold</strong>");
    expect(project.descriptionHtml).not.toContain("<script>");
  });

  it("should give colliding names distinct slugs", async () => {
    const first = await projects.create({ ...projectForm(1), project_name: "C#" });
    const second = await projects.create({ ...projectForm(2), project_name: "C++" });
    expect(first.slug).toBe("c");
    expect(second.slug).toBe("c-2");
  });

  it("should reject duplicate names", async () => {
    await createProject(1);
    await expect(projects.create(projectForm(1))).rejects.toMatchObject({
      code: 11000,
      keyPattern: { name: 1 },
    });
  });

  it("should only list and count published projects, and only feature published ones", async () => {
    await createProject(1, { isPublished: true, featured: true });
    await createProject(2, { isPublished: true });
    await createProject(3, { featured: true });

    const published = await projects.listPublished();
    expect(published.map((p) => p.name).sort()).toEqual(["Project 1", "Project 2"]);
    expect(published[0].slug).toBeTruthy();
    expect(await projects.countPublished()).toBe(2);
    expect((await projects.listFeatured()).map((p) => p.name)).toEqual(["Project 1"]);
    expect(await projects.listAll()).toHaveLength(3);
  });

  it("should publish and unpublish, reporting unknown or malformed ids", async () => {
    const project = await createProject(1);

    expect(await projects.setPublished(project._id.toString(), true)).toBe(true);
    expect((await Project.findById(project._id)).isPublished).toBe(true);

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

  it("should update fields, keep the slug and image unless given one, and bump updatedAt", async () => {
    const project = await createProject(1);
    const firstUpdatedAt = project.updatedAt;

    await projects.update(project, { ...projectForm(1), project_name: "Renamed", project_title: "New title" });
    let saved = await Project.findById(project._id);
    expect(saved.name).toBe("Renamed");
    expect(saved.title).toBe("New title");
    expect(saved.slug).toBe("project-1");
    expect(saved.image).toBe("default.png");
    expect(saved.updatedAt.getTime()).toBeGreaterThanOrEqual(firstUpdatedAt.getTime());

    await projects.update(saved, projectForm(1), "new-image.png");
    saved = await Project.findById(project._id);
    expect(saved.image).toBe("new-image.png");
  });

  it("should find by id or slug, treating malformed ids as not found", async () => {
    const project = await createProject(1);
    expect((await projects.findById(project._id.toString())).name).toBe("Project 1");
    expect((await projects.findBySlug("project-1")).name).toBe("Project 1");
    expect(await projects.findBySlug("nope")).toBeNull();
    expect(await projects.findBySlug(["project-1"])).toBeNull();
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
  it("should create a published entry with HTML, search text, a slug and a date", async () => {
    const entry = await news.create("Hello World", "Some **news** here");

    expect(entry.isPublished).toBe(true);
    expect(entry.slug).toBe("hello-world");
    expect(entry.bodyHtml).toContain("<strong>news</strong>");
    expect(entry.bodyText).toBe("Some news here\n");
    expect(entry.publishedAt).toBeInstanceOf(Date);
  });

  it("should never return unpublished entries from the public listings", async () => {
    await news.create("Visible", "Published entry body");
    const hidden = await news.create("Hidden", "Unpublished entry body");
    await news.setPublished(hidden._id.toString(), false);

    const page = await news.paginatePublished();
    expect(page.newsItems.map((n) => n.title)).toEqual(["Visible"]);
    expect(page.totalDocs).toBe(1);

    const search = await news.paginatePublished({ term: "entry" });
    expect(search.newsItems.map((n) => n.title)).toEqual(["Visible"]);

    expect((await news.listLatestPublished()).map((n) => n.title)).toEqual(["Visible"]);
    expect(await news.listAll()).toHaveLength(2);
  });

  it("should paginate newest first by default and support sorting", async () => {
    for (const title of ["Bravo", "Alpha", "Charlie"]) {
      await news.create(title, "A news body for sorting");
    }

    const newest = await news.paginatePublished({ limit: 2 });
    expect(newest.newsItems.map((n) => n.title)).toEqual(["Charlie", "Alpha"]);
    expect(newest.totalPages).toBe(2);

    const byTitle = await news.paginatePublished({ sort: "titleAsc" });
    expect(byTitle.newsItems.map((n) => n.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("should search title and body, with an exact-phrase option", async () => {
    await news.create("Deploy notes", "The server moved to a new host today");
    await news.create("Unrelated", "Nothing about servers or hosts here at all");

    const anyWord = await news.paginatePublished({ term: "host" });
    expect(anyWord.totalDocs).toBe(2);

    const phrase = await news.paginatePublished({ term: "new host", exactPhrase: true });
    expect(phrase.newsItems.map((n) => n.title)).toEqual(["Deploy notes"]);
  });

  it("should update content, keep the slug, and report unknown ids", async () => {
    const entry = await news.create("Original", "Original body text");

    expect(await news.update(entry._id.toString(), "Edited", "Edited *body* text")).toBe(true);
    const saved = await News.findById(entry._id);
    expect(saved.title).toBe("Edited");
    expect(saved.slug).toBe("original");
    expect(saved.bodyHtml).toContain("<em>body</em>");
    expect(saved.bodyText).toContain("Edited body text");

    expect(await news.update(new mongoose.Types.ObjectId().toString(), "x", "Some body text")).toBe(false);
    expect(await news.update("not-an-id", "x", "Some body text")).toBe(false);
  });

  it("should restamp the date when publishing", async () => {
    const entry = await news.create("Dated", "A body with a date");
    await News.updateOne({ _id: entry._id }, { publishedAt: new Date("2020-01-01") });

    await news.setPublished(entry._id.toString(), true);
    const saved = await News.findById(entry._id);
    expect(saved.publishedAt.getFullYear()).toBeGreaterThan(2020);
  });

  it("should remove entries", async () => {
    const entry = await news.create("Doomed", "This one gets deleted");
    expect(await news.remove(entry._id.toString())).toBe(true);
    expect(await news.remove(entry._id.toString())).toBe(false);
  });
});
