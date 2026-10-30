/*
  The public news routes over HTTP, against an in-memory MongoDB with no text index.
*/
import path from "path";
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { testConnectOptions } from "./helpers/mongo.js";

import { createViewEngine } from "../utils/viewEngine.js";
import { newsRoute } from "../routes/news.js";
import { News } from "../models/news.js";
import * as news from "../services/news.js";

jest.setTimeout(120000);

const HTMX = { "HX-Request": "true", "HX-Target": "news-results" };

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), testConnectOptions);
  await News.init();

  const posts = [
    ["Site overhaul, phase 2 done", "Layouts merged and a services layer.", true],
    ["Moving to HTMX", "Swapping jQuery out for htmx everywhere.", true],
    ["Secret draft", "This one mentions htmx too, but isn't published.", false],
  ];
  for (const [title, bodyMarkdown, isPublished] of posts) {
    await news.create({ title, slug: "", bodyMarkdown, isPublished });
  }

  app = express();
  const hbs = createViewEngine();
  app.engine("handlebars", hbs.engine);
  app.set("view engine", "handlebars");
  app.set("views", path.resolve("views"));
  app.use((req, res, next) => {
    Object.assign(res.locals, { nonce: "n", csrfToken: "t", currentyear: 2026 });
    next();
  });
  app.use("/news", newsRoute);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

function titles(html) {
  return [...html.matchAll(/<h2 class="news-item__title"><a href="[^"]+">([\s\S]*?)<\/a>/g)].map((m) => m[1]);
}

describe("GET /news", () => {
  it("should list published posts as a full page", async () => {
    const res = await request(app).get("/news");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<html");
    expect(titles(res.text)).toHaveLength(2);
    expect(res.text).not.toContain("Secret draft");
  });

  it("should search partial words and highlight them, returning just the results to htmx", async () => {
    const res = await request(app).get("/news?q=overh").set(HTMX);
    expect(res.status).toBe(200);
    expect(res.text).not.toContain("<html");
    expect(res.text).toContain("1 post matches “overh”");
    expect(titles(res.text)).toEqual(["Site <mark>overh</mark>aul, phase 2 done"]);
  });

  it("should require every word, in any order", async () => {
    const both = await request(app).get("/news?q=layer+services").set(HTMX);
    expect(titles(both.text)).toEqual(["Site overhaul, phase 2 done"]);

    const none = await request(app).get("/news?q=htmx+services").set(HTMX);
    expect(none.text).toContain("Nothing matches that search.");
  });

  it("should never search drafts", async () => {
    const res = await request(app).get("/news?q=htmx").set(HTMX);
    expect(titles(res.text)).toEqual(["Moving to <mark>HTMX</mark>"]);
  });

  it("should escape titles and the echoed search", async () => {
    const res = await request(app).get("/news?q=%3Cscript%3E").set(HTMX);
    expect(res.text).toContain("“&lt;script&gt;”");
    expect(res.text).not.toContain("<script>");
  });

  it("should sort, and keep the search and sort in pager links", async () => {
    for (let n = 0; n < 8; n++) {
      await news.create({ title: `Overhaul note ${n}`, slug: "", bodyMarkdown: "Another overhaul update.", isPublished: true });
    }
    const res = await request(app).get("/news?q=overhaul&sort=titleAsc").set(HTMX);
    expect(titles(res.text)[0]).toBe("<mark>Overhaul</mark> note 0");
    expect(res.text).toContain("page 1 of 2");
    expect(res.text).toContain('href="/news?q&#x3D;overhaul&amp;sort&#x3D;titleAsc&amp;page&#x3D;2"');
  });
});

describe("GET /news/:slug", () => {
  it("should show a published post and hide drafts", async () => {
    const post = await request(app).get("/news/moving-to-htmx");
    expect(post.status).toBe(200);
    expect(post.text).toContain('<h1 class="article__title">Moving to HTMX</h1>');

    expect((await request(app).get("/news/secret-draft")).status).toBe(404);
  });
});
