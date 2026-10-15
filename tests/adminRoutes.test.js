/*
  The admin and public project routes over HTTP, against an in-memory MongoDB. The test app
  stands in for app.js's session, passport and CSRF setup with a fake signed-in user.
*/
import path from "path";
import express from "express";
import session from "express-session";
import flash from "../utils/flash.js";
import request from "supertest";
import lusca from "lusca";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { createViewEngine } from "../utils/viewEngine.js";
import { adminRoute } from "../routes/admin/index.js";
import { projectsRoute } from "../routes/projects.js";
import { parseUploads } from "../utils/imageUpload.js";
import { Project } from "../models/projects.js";
import { News } from "../models/news.js";
import * as projects from "../services/projects.js";
import { Settings } from "../models/settings.js";
import { clearSettingsCache, getSettings } from "../services/settings.js";

const mockConfig = { showBlog: false, rootURL: "http://localhost", blogURL: "https://blog.example.com" };

jest.mock("config", () => ({
  has: jest.fn((key) => key in mockConfig),
  get: jest.fn((key) => mockConfig[key]),
}));

jest.mock("../utils/errorLogging.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../services/github.js", () => ({
  __esModule: true,
  getRepoStats: jest.fn(async () => null),
  withRepoStats: jest.fn(async (projects) => projects.map((project) => ({ ...project, github: null }))),
}));

jest.setTimeout(120000);

const ADMIN = { isAdmin: true, realName: "Ryan" };
const HTMX = { "HX-Request": "true", "HX-Current-URL": "http://localhost/admin/projects" };

let mongo;

function buildApp(user) {
  const app = express();
  const hbs = createViewEngine();
  app.engine("handlebars", hbs.engine);
  app.set("view engine", "handlebars");
  app.set("views", path.resolve("views"));
  app.use(express.urlencoded({ extended: true }));
  app.use("/admin", parseUploads);
  app.use(session({ secret: "test", resave: false, saveUninitialized: true }));
  app.use(flash());
  app.use((req, res, next) => {
    req.user = user;
    req.isAuthenticated = () => Boolean(user);
    res.locals.nonce = "test-nonce";
    res.locals.csrfToken = "test-csrf";
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
  });
  app.use("/admin", adminRoute);
  app.use("/projects", projectsRoute);
  return app;
}

const form = (overrides = {}) => ({
  name: "Snoring Ninja",
  title: "Snoring Ninja Bot",
  slug: "",
  source: "https://github.com/xNifty/snoring",
  descriptionMarkdown: "A bot that **snores** loudly, all night long.",
  ...overrides,
});

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([Project.init(), News.init()]);
});

afterEach(async () => {
  await Promise.all([Project.deleteMany({}), News.deleteMany({}), Settings.deleteMany({})]);
  clearSettingsCache();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("admin guard", () => {
  it("should send signed-out visitors to login, coming back afterwards", async () => {
    const res = await request(buildApp(null)).get("/admin/news");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login?returnTo=%2Fadmin%2Fnews");
  });

  it("should tell htmx to redirect rather than swapping a login page in", async () => {
    const res = await request(buildApp(null)).put("/admin/projects/abc/publish").set(HTMX);
    expect(res.status).toBe(401);
    expect(res.headers["hx-redirect"]).toBe("/login?returnTo=http%3A%2F%2Flocalhost%2Fadmin%2Fprojects");
  });

  it("should turn away signed-in non-admins", async () => {
    const res = await request(buildApp({ isAdmin: false })).get("/admin");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
  });
});

describe("dashboard", () => {
  it("should show counts and recent edits", async () => {
    await projects.create({ ...form(), isPublished: true });
    const res = await request(buildApp(ADMIN)).get("/admin");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Published projects");
    expect(res.text).toContain('href="/admin/projects/');
    expect(res.text).toContain("Snoring Ninja");
    expect(res.text).toContain('hx-get="/admin/health"');
  });

  it("should report service health", async () => {
    const res = await request(buildApp(ADMIN)).get("/admin/health");
    expect(res.text).toMatch(/health--ok[\s\S]*Database/);
    expect(res.text).toMatch(/health--off[\s\S]*Blog \(Ghost\)/);
  });
});

describe("settings", () => {
  it("should switch the blog off and on", async () => {
    const agent = request.agent(buildApp(ADMIN));
    await agent.post("/admin/settings").type("form").send({ showBlog: "on" });
    expect((await getSettings()).showBlog).toBe(true);

    const res = await agent.post("/admin/settings").type("form").send({});
    expect(res.headers.location).toBe("/admin/settings");
    expect((await getSettings()).showBlog).toBe(false);

    const page = await agent.get("/admin/settings");
    expect(page.text).toContain("The blog is switched off.");
    expect(page.text).not.toMatch(/name="showBlog"[^>]*checked/);
    expect(page.text).toContain('<a href="/admin/settings" aria-current="page">Settings</a>');

    const health = await agent.get("/admin/health");
    expect(health.text).toMatch(/health--off[\s\S]*Switched off in Settings/);
  });
});

describe("project editor", () => {
  it("should create a project and land on its editor with a confirmation", async () => {
    const agent = request.agent(buildApp(ADMIN));
    const res = await agent.post("/admin/projects").type("form").send(form({ isPublished: "on" }));

    const saved = await Project.findOne({ name: "Snoring Ninja" });
    expect(saved).toMatchObject({ slug: "snoring-ninja", isPublished: true });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/admin/projects/${saved._id}/edit`);

    const editor = await agent.get(res.headers.location);
    expect(editor.text).toContain("Created “Snoring Ninja”.");
    expect(editor.text).toContain('value="snoring-ninja"');
  });

  it("should show field errors and keep what was typed", async () => {
    const res = await request(buildApp(ADMIN))
      .post("/admin/projects")
      .type("form")
      .send(form({ title: "", slug: "Bad Slug", name: "Kept <name>" }));

    expect(res.status).toBe(400);
    expect(res.text).toContain("Title is required.");
    expect(res.text).toContain("Slug may only contain lowercase letters");
    expect(res.text).toContain('value="Kept &lt;name&gt;"');
    expect(await Project.countDocuments()).toBe(0);
  });

  it("should point duplicate slugs at the slug field", async () => {
    await projects.create({ ...form(), slug: "taken" });
    const res = await request(buildApp(ADMIN))
      .post("/admin/projects")
      .type("form")
      .send(form({ name: "Other", title: "Other", slug: "taken" }));

    expect(res.status).toBe(400);
    expect(res.text).toContain("Another project already uses this slug.");
  });

  it("should reject files that aren't images", async () => {
    const res = await request(buildApp(ADMIN))
      .post("/admin/projects")
      .field(form())
      .attach("image", Buffer.from("<svg onload=alert(1)>"), { filename: "x.png", contentType: "image/png" });

    expect(res.status).toBe(400);
    expect(res.text).toContain("Images must be a PNG, JPG, GIF or WebP file.");
    expect(await Project.countDocuments()).toBe(0);
  });

  it("should save edits, keeping the old slug as a redirect", async () => {
    const project = await projects.create({ ...form(), isPublished: true });
    const app = buildApp(ADMIN);

    const res = await request(app)
      .post(`/admin/projects/${project._id}`)
      .type("form")
      .send(form({ slug: "ninja", isPublished: "on" }));
    expect(res.status).toBe(302);

    const old = await request(app).get("/projects/snoring-ninja");
    expect(old.status).toBe(301);
    expect(old.headers.location).toBe("/projects/ninja");
  });

  it("should send unknown ids back to the list", async () => {
    const res = await request(buildApp(ADMIN)).get(`/admin/projects/${new mongoose.Types.ObjectId()}/edit`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/admin/projects");
  });

  it("should render previews with the site's markdown pipeline", async () => {
    const app = buildApp(ADMIN);
    const project = await request(app)
      .post("/admin/preview/project")
      .type("form")
      .send({ descriptionMarkdown: "**Hi** <script>alert(1)</script>\n\n```js\nconst a = 1;\n```" });
    expect(project.text).toContain("<strong>Hi</strong>");
    expect(project.text).not.toContain("<script>");
    expect(project.text).toContain('class="hljs-keyword"');

    const empty = await request(app).post("/admin/preview/news").type("form").send({ bodyMarkdown: " " });
    expect(empty.text).toContain("Nothing to preview yet.");

    expect((await request(app).post("/admin/preview/other").type("form").send({})).status).toBe(404);
  });
});

describe("project list actions", () => {
  it("should filter by status", async () => {
    await projects.create({ ...form(), isPublished: true });
    await projects.create({ ...form({ name: "Draft", title: "Draft title" }), isPublished: false });

    const res = await request(buildApp(ADMIN)).get("/admin/projects?status=drafts");
    expect(res.text).toContain(">Draft<");
    expect(res.text).not.toContain(">Snoring Ninja<");
    expect(res.text).toMatch(/href="\/admin\/projects\?status=drafts" aria-current="page"/);
  });

  it("should publish in place, returning the row and a toast", async () => {
    const project = await projects.create({ ...form(), isPublished: false });
    const res = await request(buildApp(ADMIN)).put(`/admin/projects/${project._id}/publish`).set(HTMX);

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/^\s*<tr id="project-/);
    expect(res.text).toContain(`hx-put="/admin/projects/${project._id}/unpublish"`);
    expect(res.text).toContain('hx-swap-oob="beforeend"');
    expect(res.text).toContain("Published “Snoring Ninja”.");
  });

  it("should explain when the featured limit is reached", async () => {
    for (let n = 0; n < projects.FEATURED_LIMIT; n++) {
      const p = await projects.create({ ...form({ name: `P${n}`, title: `T${n}` }) });
      await projects.toggleFeatured(p._id.toString());
    }
    const extra = await projects.create(form());

    const res = await request(buildApp(ADMIN)).put(`/admin/projects/${extra._id}/feature`).set(HTMX);
    expect(res.text).toContain('aria-checked="false"');
    expect(res.text).toContain(`Only ${projects.FEATURED_LIMIT} projects can be featured.`);
  });

  it("should delete, removing the row", async () => {
    const project = await projects.create(form());
    const res = await request(buildApp(ADMIN)).delete(`/admin/projects/${project._id}`).set(HTMX);

    expect(res.text).not.toContain("<tr");
    expect(res.text).toContain("Deleted “Snoring Ninja”.");
    expect(await Project.countDocuments()).toBe(0);

    const again = await request(buildApp(ADMIN)).delete(`/admin/projects/${project._id}`).set(HTMX);
    expect(again.text).toContain("That project no longer exists.");
  });
});

describe("news editor", () => {
  it("should create, edit and unpublish a post", async () => {
    const agent = request.agent(buildApp(ADMIN));

    const created = await agent
      .post("/admin/news")
      .type("form")
      .send({ title: "Launch day", slug: "", bodyMarkdown: "The site is **live**.", isPublished: "on" });
    const entry = await News.findOne({ title: "Launch day" });
    expect(created.headers.location).toBe(`/admin/news/${entry._id}/edit`);
    expect(entry).toMatchObject({ slug: "launch-day", isPublished: true });

    await agent
      .post(`/admin/news/${entry._id}`)
      .type("form")
      .send({ title: "Launch day!", slug: "launch-day", bodyMarkdown: "The site is **live** now." });
    expect(await News.findById(entry._id)).toMatchObject({ title: "Launch day!", isPublished: false });

    const list = await agent.get("/admin/news?status=drafts");
    expect(list.text).toContain("Launch day!");
  });
});

describe("CSRF on multipart forms", () => {
  // Mirrors app.js: uploads are parsed before lusca so it can see the form's _csrf field
  function csrfApp({ parseFirst }) {
    const app = express();
    app.use(session({ secret: "test", resave: false, saveUninitialized: true }));
    if (parseFirst) app.use("/admin", parseUploads);
    app.use(lusca.csrf());
    app.get("/token", (req, res) => res.send(res.locals._csrf));
    app.post("/admin/save", (req, res) => res.send("saved"));
    return app;
  }

  it("should accept a multipart form carrying its _csrf field", async () => {
    const agent = request.agent(csrfApp({ parseFirst: true }));
    const token = (await agent.get("/token")).text;

    const ok = await agent.post("/admin/save").field("_csrf", token).field("name", "x");
    expect(ok.status).toBe(200);

    const forged = await agent.post("/admin/save").field("name", "x");
    expect(forged.status).toBe(403);
  });

  it("would reject every multipart save if uploads were parsed after lusca", async () => {
    const agent = request.agent(csrfApp({ parseFirst: false }));
    const token = (await agent.get("/token")).text;

    const res = await agent.post("/admin/save").field("_csrf", token);
    expect(res.status).toBe(403);
  });
});

describe("public project routes", () => {
  it("should redirect id links and old admin bookmarks", async () => {
    const project = await projects.create({ ...form(), isPublished: true });
    const app = buildApp(null);

    const byId = await request(app).get(`/projects/${project._id}`);
    expect(byId.status).toBe(301);
    expect(byId.headers.location).toBe("/projects/snoring-ninja");

    expect((await request(app).get("/projects/new")).headers.location).toBe("/admin/projects/new");
    expect((await request(app).get(`/projects/${project._id}/edit`)).headers.location).toBe(
      `/admin/projects/${project._id}/edit`
    );
  });

  it("should hide drafts", async () => {
    await projects.create(form());
    expect((await request(buildApp(null)).get("/projects/snoring-ninja")).status).toBe(404);
  });
});
