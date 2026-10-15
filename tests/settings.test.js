import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import GhostContentAPI from "@tryghost/content-api";

import { Settings } from "../models/settings.js";
import { getSettings, updateSettings, clearSettingsCache } from "../services/settings.js";
import { listRecentPosts } from "../services/blog.js";
import logErrorToFile from "../utils/errorLogging.js";

const mockConfig = { showBlog: true, blogURL: "https://blog.example.com", blogVersion: "v5.0" };

jest.mock("config", () => ({
  has: jest.fn((key) => key in mockConfig),
  get: jest.fn((key) => mockConfig[key]),
}));

jest.mock("../utils/errorLogging.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@tryghost/content-api", () => {
  const browse = jest.fn();
  const GhostContentAPI = jest.fn(() => ({ posts: { browse } }));
  GhostContentAPI.browse = browse;
  return { __esModule: true, default: GhostContentAPI };
});

jest.setTimeout(120000);

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await Settings.deleteMany({});
  clearSettingsCache();
  jest.clearAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("settings service", () => {
  it("should start from config until saved", async () => {
    expect(await getSettings()).toMatchObject({ showBlog: true });
  });

  it("should save, and the saved value wins over config", async () => {
    expect(await updateSettings({ showBlog: false })).toMatchObject({ showBlog: false });
    clearSettingsCache();
    expect(await getSettings()).toMatchObject({ showBlog: false });
    expect(await Settings.countDocuments()).toBe(1);

    await updateSettings({ showBlog: true });
    expect(await Settings.countDocuments()).toBe(1);
  });

  it("should serve from cache until a save clears it", async () => {
    await getSettings();
    await Settings.updateOne({ _id: "site" }, { showBlog: false }, { upsert: true });
    expect((await getSettings()).showBlog).toBe(true); // still cached

    await updateSettings({ showBlog: false });
    expect((await getSettings()).showBlog).toBe(false);
  });

  it("should fall back to config if the database read fails", async () => {
    const spy = jest.spyOn(Settings, "findById").mockImplementationOnce(() => {
      throw new Error("db down");
    });
    expect(await getSettings()).toMatchObject({ showBlog: true });
    expect(logErrorToFile).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("listRecentPosts", () => {
  const post = { id: "1", title: "Hello", published_at: "2026-06-10T11:52:00Z" };

  it("should format a list of posts", async () => {
    GhostContentAPI.browse.mockResolvedValueOnce([post, { ...post, id: "2" }]);
    const posts = await listRecentPosts();
    expect(posts).toHaveLength(2);
    expect(posts[0].formatted_date).toMatch(/^June 10th, 2026 @ /);
  });

  it("should accept a lone post, which the client returns unwrapped", async () => {
    GhostContentAPI.browse.mockResolvedValueOnce(post);
    expect(await listRecentPosts()).toHaveLength(1);
  });

  it("should explain a reply that isn't posts, e.g. blogURL redirecting to a website", async () => {
    GhostContentAPI.browse.mockResolvedValueOnce(undefined);
    await expect(listRecentPosts()).rejects.toThrow(
      "https://blog.example.com didn't answer with blog posts; check blogURL"
    );
  });
});
