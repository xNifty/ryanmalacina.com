import { parseRepo, getRepoStats, withRepoStats, clearRepoCache } from "../services/github.js";
import logErrorToFile from "../utils/errorLogging.js";

jest.mock("../utils/errorLogging.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const REPO = {
  stargazers_count: 1234,
  language: "Go",
  pushed_at: "2026-09-01T12:00:00Z",
  archived: false,
  html_url: "https://github.com/xNifty/gotodo",
};

function respond(body, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

const realFetch = global.fetch;

beforeEach(() => {
  clearRepoCache();
  global.fetch = jest.fn(() => respond(REPO));
  delete process.env.GitHubAuth;
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = realFetch;
});

describe("parseRepo", () => {
  it.each([
    ["https://github.com/xNifty/gotodo", "xNifty/gotodo"],
    ["https://www.github.com/xNifty/gotodo.git", "xNifty/gotodo"],
    ["http://github.com/xNifty/ryanmalacina.com/tree/master", "xNifty/ryanmalacina.com"],
    ["https://gitlab.com/xNifty/gotodo", null],
    ["https://github.com/xNifty", null],
    ["https://github.com.evil.example/a/b", null],
    [undefined, null],
  ])("%s -> %s", (url, repo) => {
    expect(parseRepo(url)).toBe(repo);
  });
});

describe("getRepoStats", () => {
  it("should fetch once and serve from the cache after", async () => {
    const stats = await getRepoStats("https://github.com/xNifty/gotodo");
    expect(stats).toEqual({
      stars: 1234,
      language: "Go",
      pushedAt: new Date("2026-09-01T12:00:00Z"),
      archived: false,
      url: "https://github.com/xNifty/gotodo",
    });
    await getRepoStats("https://github.com/xNifty/gotodo.git");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("https://api.github.com/repos/xNifty/gotodo");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("should share one request between concurrent callers", async () => {
    await Promise.all([getRepoStats("https://github.com/a/b"), getRepoStats("https://github.com/a/b")]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("should send the token when one is configured", async () => {
    process.env.GitHubAuth = "ghp_example";
    await getRepoStats("https://github.com/a/b");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer ghp_example");
  });

  it("should drop a rejected token and retry anonymously", async () => {
    process.env.GitHubAuth = "ghp_expired";
    fetch.mockImplementationOnce(() => respond({}, 401));
    expect((await getRepoStats("https://github.com/a/b")).stars).toBe(1234);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBeUndefined();

    await getRepoStats("https://github.com/c/d");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][1].headers.Authorization).toBeUndefined();
  });

  it("should give null on failure and not ask again straight away", async () => {
    fetch.mockImplementation(() => respond({}, 403));
    expect(await getRepoStats("https://github.com/a/b")).toBeNull();
    expect(await getRepoStats("https://github.com/a/b")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(logErrorToFile).toHaveBeenCalled();
  });

  it("should serve stale stats while refreshing in the background", async () => {
    const now = Date.now();
    const clock = jest.spyOn(Date, "now").mockReturnValue(now);
    await getRepoStats("https://github.com/a/b");

    clock.mockReturnValue(now + 61 * 60 * 1000);
    fetch.mockImplementation(() => respond({ ...REPO, stargazers_count: 5 }));
    expect((await getRepoStats("https://github.com/a/b")).stars).toBe(1234);
    expect(fetch).toHaveBeenCalledTimes(2);

    await new Promise((resolve) => setImmediate(resolve));
    expect((await getRepoStats("https://github.com/a/b")).stars).toBe(5);
    clock.mockRestore();
  });

  it("should skip sources that aren't GitHub repos", async () => {
    const projects = await withRepoStats([{ name: "A", source: "https://example.com" }]);
    expect(projects).toEqual([{ name: "A", source: "https://example.com", github: null }]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
