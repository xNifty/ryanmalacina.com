import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { testConnectOptions } from "./helpers/mongo.js";

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
  await mongoose.connect(mongo.getUri(), testConnectOptions);
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

// Validated editor data, as utils/validation.js returns it
function projectData(n, overrides = {}) {
  return {
    name: `Project ${n}`,
    title: `Title ${n}`,
    slug: "",
    source: `https://example.com/${n}`,
    descriptionMarkdown: "A description long enough to pass validation.",
    isPublished: false,
    ...overrides,
  };
}

function newsData(title, overrides = {}) {
  return { title, slug: "", bodyMarkdown: "A news body long enough.", isPublished: true, ...overrides };
}

async function createProject(n, flags = {}) {
  const project = await projects.create(projectData(n));
  if (Object.keys(flags).length) {
    await Project.updateOne({ _id: project._id }, flags);
  }
  return project;
}

describe("projects service", () => {
  it("should create a project with rendered HTML, a generated slug and the default image", async () => {
    const project = await projects.create(
      projectData(1, {
        name: "My Cool Project!",
        descriptionMarkdown: "Some **bold** text <script>alert(1)</script>",
      })
    );

    expect(project.slug).toBe("my-cool-project");
    expect(project.image).toBe("default.png");
    expect(project.isPublished).toBe(false);
    expect(project.createdAt).toBeInstanceOf(Date);
    expect(project.descriptionHtml).toContain("<strong>bold</strong>");
    expect(project.descriptionHtml).not.toContain("<script>");
  });

  it("should use a slug given in the editor, and number generated ones that collide", async () => {
    expect((await projects.create(projectData(1, { slug: "custom" }))).slug).toBe("custom");
    expect((await projects.create(projectData(2, { name: "C#" }))).slug).toBe("c");
    expect((await projects.create(projectData(3, { name: "C++" }))).slug).toBe("c-2");
    await expect(projects.create(projectData(4, { slug: "custom" }))).rejects.toMatchObject({
      code: 11000,
      keyPattern: { slug: 1 },
    });
  });

  it("should reject duplicate names", async () => {
    await createProject(1);
    await expect(projects.create(projectData(1))).rejects.toMatchObject({
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
    expect(await projects.countPublished()).toBe(2);
    expect((await projects.listFeatured()).map((p) => p.name)).toEqual(["Project 1"]);
    expect(await projects.stats()).toEqual({ total: 3, published: 2, drafts: 1, featured: 2 });
  });

  it("should filter the admin list by status, most recently edited first", async () => {
    const first = await createProject(1, { isPublished: true });
    await createProject(2);
    await projects.update(await projects.findById(first._id), projectData(1, { title: "Edited", isPublished: true }));

    expect((await projects.listAll()).map((p) => p.name)).toEqual(["Project 1", "Project 2"]);
    expect((await projects.listAll("drafts")).map((p) => p.name)).toEqual(["Project 2"]);
    expect((await projects.listAll("published")).map((p) => p.name)).toEqual(["Project 1"]);
    expect(await projects.listAll("featured")).toEqual([]);
    expect((await projects.recentlyUpdated(1))[0].name).toBe("Project 1");
  });

  it("should publish and unpublish, returning the updated row", async () => {
    const project = await createProject(1);

    const row = await projects.setPublished(project._id.toString(), true);
    expect(row).toMatchObject({ name: "Project 1", isPublished: true });
    expect(row).not.toHaveProperty("descriptionMarkdown");

    expect(await projects.setPublished(new mongoose.Types.ObjectId().toString(), true)).toBeNull();
    expect(await projects.setPublished("not-an-id", true)).toBeNull();
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

  it("should update fields, keep the image unless given one, and set publish state", async () => {
    const project = await createProject(1);

    await projects.update(project, projectData(1, { title: "New title", isPublished: true }));
    let saved = await Project.findById(project._id);
    expect(saved.title).toBe("New title");
    expect(saved.slug).toBe("project-1");
    expect(saved.image).toBe("default.png");
    expect(saved.isPublished).toBe(true);

    await projects.update(saved, projectData(1), "new-image.png");
    saved = await Project.findById(project._id);
    expect(saved.image).toBe("new-image.png");
    expect(saved.isPublished).toBe(false);
  });

  it("should save a description at the markdown limit even though its HTML is longer", async () => {
    const paragraph = "Some **bold** text with a [link](https://example.com/docs).\n\n";
    const descriptionMarkdown = paragraph.repeat(Math.floor(25000 / paragraph.length));
    const project = await createProject(1);

    await projects.update(project, projectData(1, { descriptionMarkdown }));
    const saved = await Project.findById(project._id);
    expect(saved.descriptionHtml.length).toBeGreaterThan(25000);
  });

  it("should keep old slugs findable after a rename", async () => {
    const project = await createProject(1);

    await projects.update(project, projectData(1, { slug: "renamed" }));
    await projects.update(await projects.findById(project._id), projectData(1, { slug: "renamed-again" }));

    const saved = await Project.findById(project._id);
    expect(saved.slug).toBe("renamed-again");
    expect(saved.previousSlugs).toEqual(["project-1", "renamed"]);
    expect((await projects.findBySlug("project-1")).slug).toBe("renamed-again");
    expect((await projects.findBySlug("renamed")).slug).toBe("renamed-again");

    // Renaming back to an old slug takes it out of the history
    await projects.update(saved, projectData(1, { slug: "project-1" }));
    expect((await Project.findById(project._id)).previousSlugs).toEqual(["renamed", "renamed-again"]);
  });

  it("should find by id or slug, treating malformed input as not found", async () => {
    const project = await createProject(1);
    expect((await projects.findById(project._id.toString())).name).toBe("Project 1");
    expect((await projects.findRow(project._id.toString())).name).toBe("Project 1");
    expect((await projects.findBySlug("project-1")).name).toBe("Project 1");
    expect(await projects.findBySlug("nope")).toBeNull();
    expect(await projects.findBySlug(["project-1"])).toBeNull();
    expect(await projects.findById("not-an-id")).toBeNull();
  });

  it("should remove projects", async () => {
    const project = await createProject(1);
    expect(await projects.remove(project._id.toString())).toBe(true);
    expect(await projects.remove(project._id.toString())).toBe(false);
    expect(await projects.remove("not-an-id")).toBe(false);
  });
});

describe("news service", () => {
  it("should create entries with HTML, search text, a slug and a date", async () => {
    const entry = await news.create(newsData("Hello World", { bodyMarkdown: "Some **news** here" }));

    expect(entry.isPublished).toBe(true);
    expect(entry.slug).toBe("hello-world");
    expect(entry.bodyHtml).toContain("<strong>news</strong>");
    expect(entry.bodyText).toBe("Some news here\n");
    expect(entry.publishedAt).toBeInstanceOf(Date);

    const draft = await news.create(newsData("A draft", { isPublished: false, slug: "my-draft" }));
    expect(draft.isPublished).toBe(false);
    expect(draft.slug).toBe("my-draft");
  });

  it("should never return unpublished entries from the public listings", async () => {
    await news.create(newsData("Visible", { bodyMarkdown: "Published entry body" }));
    await news.create(newsData("Hidden", { bodyMarkdown: "Unpublished entry body", isPublished: false }));

    const page = await news.paginatePublished();
    expect(page.newsItems.map((n) => n.title)).toEqual(["Visible"]);
    expect(page.totalDocs).toBe(1);

    const search = await news.paginatePublished({ term: "entry" });
    expect(search.newsItems.map((n) => n.title)).toEqual(["Visible"]);

    expect((await news.listLatestPublished()).map((n) => n.title)).toEqual(["Visible"]);
    expect((await news.listAll("drafts")).map((n) => n.title)).toEqual(["Hidden"]);
    expect(await news.stats()).toEqual({ total: 2, published: 1, drafts: 1 });
  });

  it("should paginate newest first by default and support sorting", async () => {
    for (const title of ["Bravo", "Alpha", "Charlie"]) {
      await news.create(newsData(title));
    }

    const newest = await news.paginatePublished({ limit: 2 });
    expect(newest.newsItems.map((n) => n.title)).toEqual(["Charlie", "Alpha"]);
    expect(newest.totalPages).toBe(2);

    const byTitle = await news.paginatePublished({ sort: "titleAsc" });
    expect(byTitle.newsItems.map((n) => n.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("should search title and body, requiring every word, partial words included", async () => {
    await news.create(newsData("Deploy notes", { bodyMarkdown: "The server moved to a new host today" }));
    await news.create(newsData("Unrelated", { bodyMarkdown: "Nothing about servers or hosts here at all" }));

    const titles = async (term) => (await news.paginatePublished({ term })).newsItems.map((n) => n.title).sort();

    expect(await titles("host")).toEqual(["Deploy notes", "Unrelated"]);
    expect(await titles("HOST new")).toEqual(["Deploy notes"]); // any order, any case
    expect(await titles("depl")).toEqual(["Deploy notes"]); // partial word, in the title
    expect(await titles('"moved"')).toEqual(["Deploy notes"]); // quotes are ignored
    expect(await titles("host nowhere")).toEqual([]);
    expect(await titles("a.b (")).toEqual([]); // regex characters are literal
    expect(await titles("   ")).toEqual(["Deploy notes", "Unrelated"]);
  });

  it("should not need a text index to search", async () => {
    await news.create(newsData("Indexless", { bodyMarkdown: "Searching without a text index." }));
    const indexes = await News.collection.indexes();
    expect(indexes.some((index) => index.key?._fts === "text")).toBe(false);
    expect((await news.paginatePublished({ term: "without" })).totalDocs).toBe(1);
  });

  it("should update content and slug, stamping the date only when newly published", async () => {
    const entry = await news.create(newsData("Original", { isPublished: false }));

    await news.update(entry, newsData("Edited", { bodyMarkdown: "Edited *body* text", isPublished: false }));
    let saved = await News.findById(entry._id);
    expect(saved.title).toBe("Edited");
    expect(saved.slug).toBe("original");
    expect(saved.bodyHtml).toContain("<em>body</em>");

    await News.updateOne({ _id: entry._id }, { publishedAt: new Date("2020-01-01") });
    saved = await News.findById(entry._id);
    await news.update(saved, newsData("Edited", { slug: "edited", isPublished: true }));
    saved = await News.findById(entry._id);
    expect(saved.slug).toBe("edited");
    expect(saved.publishedAt.getFullYear()).toBeGreaterThan(2020);

    // Saving an already-published entry keeps its date
    const stamped = saved.publishedAt.getTime();
    await news.update(saved, newsData("Edited again", { isPublished: true }));
    expect((await News.findById(entry._id)).publishedAt.getTime()).toBe(stamped);
  });

  it("should publish and unpublish, returning the updated row", async () => {
    const entry = await news.create(newsData("Dated"));
    await News.updateOne({ _id: entry._id }, { publishedAt: new Date("2020-01-01") });

    const row = await news.setPublished(entry._id.toString(), true);
    expect(row).toMatchObject({ title: "Dated", isPublished: true });
    expect(row.publishedAt.getFullYear()).toBeGreaterThan(2020);
    expect(await news.setPublished("not-an-id", true)).toBeNull();
  });

  it("should remove entries", async () => {
    const entry = await news.create(newsData("Doomed"));
    expect(await news.remove(entry._id.toString())).toBe(true);
    expect(await news.remove(entry._id.toString())).toBe(false);
  });
});
