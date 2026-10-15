/*
  The about, now and uses pages: the service, the public routes and the admin editor, against
  an in-memory MongoDB. The test app stands in for app.js's session and auth setup.
*/
import path from "path";
import express from "express";
import session from "express-session";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import flash from "../utils/flash.js";
import { createViewEngine } from "../utils/viewEngine.js";
import { adminRoute } from "../routes/admin/index.js";
import { pageRoute } from "../routes/pages.js";
import { Page } from "../models/page.js";
import { Settings } from "../models/settings.js";
import * as pages from "../services/pages.js";
import { clearSettingsCache, getSettings } from "../services/settings.js";
import { accentCss } from "../utils/accent.js";

const mockConfig = { showBlog: false, rootURL: "http://localhost", blogURL: "https://blog.example.com" };

jest.mock("config", () => ({
  has: jest.fn((key) => key in mockConfig),
  get: jest.fn((key) => mockConfig[key]),
}));

jest.mock("../utils/errorLogging.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.setTimeout(120000);

const ADMIN = { isAdmin: true, realName: "Ryan" };

let mongo;

function buildApp(user) {
  const app = express();
  const hbs = createViewEngine();
  app.engine("handlebars", hbs.engine);
  app.set("view engine", "handlebars");
  app.set("views", path.resolve("views"));
  app.use(express.urlencoded({ extended: true }));
  app.use(session({ secret: "test", resave: false, saveUninitialized: true }));
  app.use(flash());
  app.use(async (req, res, next) => {
    req.user = user;
    req.isAuthenticated = () => Boolean(user);
    res.locals.nonce = "test-nonce";
    res.locals.csrfToken = "test-csrf";
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    // As app.js does
    res.locals.navPages = await pages.publishedPages();
    res.locals.accentCss = accentCss(await getSettings());
    next();
  });
  app.use("/admin", adminRoute);
  app.use("/about", pageRoute("about"));
  app.use("/now", pageRoute("now"));
  app.use("/uses", pageRoute("uses"));
  app.use((req, res) => res.status(404).send("not found"));
  return app;
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await Promise.all([Page.deleteMany({}), Settings.deleteMany({})]);
  pages.clearPagesCache();
  clearSettingsCache();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("pages service", () => {
  it("should start from the defaults: about published, now and uses drafts", async () => {
    const list = await pages.listPages();
    expect(list.map((page) => [page.key, page.isPublished, page.saved])).toEqual([
      ["about", true, false],
      ["now", false, false],
      ["uses", false, false],
    ]);
    expect(await pages.publishedPages()).toEqual({ about: { path: "/about", label: "About" } });
    expect(await pages.getPage("nope")).toBeNull();
    expect(await pages.getPage("constructor")).toBeNull();
  });

  it("should save a page and clear the cache", async () => {
    await pages.listPages();
    const saved = await pages.savePage("now", {
      title: "Now",
      intro: "Lately",
      bodyMarkdown: "Building things",
      timeline: [{ when: "2020", what: "ignored" }],
      isPublished: true,
    });
    expect(saved).toMatchObject({ key: "now", title: "Now", isPublished: true, saved: true });
    // Only the about page keeps a timeline
    expect(saved.timeline).toEqual([]);
    expect(saved.updatedAt).toBeInstanceOf(Date);
    expect(Object.keys(await pages.publishedPages())).toEqual(["about", "now"]);
  });

  it("should refuse unknown pages", async () => {
    await expect(pages.savePage("admin", { title: "x", bodyMarkdown: "x" })).rejects.toThrow("Unknown page");
  });
});

describe("public pages", () => {
  it("should show the starter about page until it's saved", async () => {
    const res = await request(buildApp(null)).get("/about");
    expect(res.status).toBe(200);
    expect(res.text).toContain("About me");
    expect(res.text).toContain("cat about.md");
    expect(res.text).toContain('href="https://github.com/xnifty/ryanmalacina.com"');
  });

  it("should 404 drafts and show them once published", async () => {
    const app = buildApp(null);
    expect((await request(app).get("/now")).status).toBe(404);

    await pages.savePage("now", { title: "Right now", bodyMarkdown: "## Busy\n\n<script>x</script>", isPublished: true });
    const res = await request(buildApp(null)).get("/now");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<h2>Busy</h2>");
    // Raw HTML in the markdown is escaped
    expect(res.text).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(res.text).toContain("last updated");
    expect(res.text).toContain("nownownow.com");
  });

  it("should show the about timeline", async () => {
    await pages.savePage("about", {
      title: "About",
      bodyMarkdown: "Hi",
      timeline: [{ when: "2019 – now", what: "Developer <b>", detail: "SQL" }],
      isPublished: true,
    });
    const res = await request(buildApp(null)).get("/about");
    expect(res.text).toContain('<span class="timeline__when">2019 – now</span>');
    expect(res.text).toContain("Developer &lt;b&gt;");
  });
});

describe("admin pages", () => {
  it("should list the pages", async () => {
    const res = await request(buildApp(ADMIN)).get("/admin/pages");
    expect(res.status).toBe(200);
    expect(res.text).toContain('href="/admin/pages/now/edit"');
    expect(res.text).toContain("Never saved");
    expect(res.text).toContain('<a href="/admin/pages" aria-current="page">Pages</a>');
  });

  it("should save the about page with its timeline", async () => {
    const agent = request.agent(buildApp(ADMIN));
    const res = await agent
      .post("/admin/pages/about")
      .type("form")
      .send({
        title: "About me",
        intro: "Hello",
        bodyMarkdown: "I write code.",
        timeline: "2019 – now | Developer | SQL and ASP.NET\n\n2015 | Started coding",
        isPublished: "on",
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/admin/pages/about/edit");

    const stored = await Page.findById("about").lean();
    expect(stored.timeline).toEqual([
      { when: "2019 – now", what: "Developer", detail: "SQL and ASP.NET" },
      { when: "2015", what: "Started coding", detail: "" },
    ]);

    const editor = await agent.get(res.headers.location);
    expect(editor.text).toContain("Saved “About me”.");
    expect(editor.text).toContain("2019 – now | Developer | SQL and ASP.NET\n2015 | Started coding");
  });

  it("should show errors and keep what was typed", async () => {
    const res = await request(buildApp(ADMIN))
      .post("/admin/pages/about")
      .type("form")
      .send({ title: "", bodyMarkdown: "x", timeline: "just one part" });
    expect(res.status).toBe(400);
    expect(res.text).toContain("Title is required.");
    expect(res.text).toContain("Line 1: write it as");
    expect(res.text).toContain("just one part");
    expect(await Page.countDocuments()).toBe(0);
  });

  it("should send unknown pages back to the list", async () => {
    const res = await request(buildApp(ADMIN)).get("/admin/pages/nope/edit");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/admin/pages");
  });

  it("should preview page markdown", async () => {
    const res = await request(buildApp(ADMIN))
      .post("/admin/preview/page")
      .type("form")
      .send({ bodyMarkdown: "**hi**" });
    expect(res.text).toContain("<strong>hi</strong>");
  });
});

describe("admin settings", () => {
  it("should save the accent and terminal lines, storing the default colours as unset", async () => {
    const agent = request.agent(buildApp(ADMIN));
    const res = await agent
      .post("/admin/settings")
      .type("form")
      .send({ accentLight: "#6D28D9", accentDark: "#3ddc84", heroLines: "editor: VS Code\nfocus: Go" });
    expect(res.status).toBe(302);

    const settings = await getSettings();
    expect(settings).toMatchObject({ accentLight: "#6d28d9", accentDark: "", heroLines: "editor: VS Code\nfocus: Go" });

    const page = await agent.get("/admin/settings");
    expect(page.text).toContain('value="#6d28d9"');
    // The admin picks up the accent too
    expect(page.text).toMatch(/<style nonce="test-nonce">[^<]*--accent: #6d28d9/);
  });

  it("should reject bad colours and lines", async () => {
    const res = await request(buildApp(ADMIN))
      .post("/admin/settings")
      .type("form")
      .send({ accentLight: "red;}</style>", accentDark: "#000000", heroLines: "no colon here" });
    expect(res.status).toBe(400);
    expect(res.text).toContain("Light theme accent must be a colour like #3ddc84.");
    expect(res.text).toContain("Line 1: write it as “key: value”");
    expect(res.text).not.toContain("</style>\"");
  });

  it("should warn about hard-to-read accents", async () => {
    await request(buildApp(ADMIN)).post("/admin/settings").type("form").send({ accentLight: "#ffff00", accentDark: "#3ddc84" });
    const page = await request(buildApp(ADMIN)).get("/admin/settings");
    expect(page.text).toContain("The light theme accent has a contrast of");
  });
});
