import { verify, siteKey } from "../services/turnstile.js";
import logErrorToFile from "../utils/errorLogging.js";

const mockConfig = { turnstileSiteKey: "0x4AAAAAAA" };

jest.mock("config", () => ({
  has: jest.fn((key) => key in mockConfig),
  get: jest.fn((key) => mockConfig[key]),
}));

jest.mock("../utils/errorLogging.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const realFetch = global.fetch;

function respond(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

beforeEach(() => {
  process.env.turnstileSecretKey = "secret";
  global.fetch = jest.fn(() => respond({ success: true }));
});

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = realFetch;
  delete process.env.turnstileSecretKey;
});

describe("turnstile", () => {
  it("should read the site key from config", () => {
    expect(siteKey()).toBe("0x4AAAAAAA");
  });

  it("should pass a token Cloudflare accepts, sending the secret and visitor address", async () => {
    expect(await verify("token", "203.0.113.5")).toEqual({ success: true });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(options.method).toBe("POST");
    expect(Object.fromEntries(options.body)).toEqual({ secret: "secret", response: "token", remoteip: "203.0.113.5" });
  });

  it("should refuse a missing token without asking Cloudflare", async () => {
    const result = await verify("");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/spam check didn't finish/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should explain expired or reused tokens", async () => {
    fetch.mockImplementation(() => respond({ success: false, "error-codes": ["timeout-or-duplicate"] }));
    expect((await verify("token")).error).toBe("The spam check expired. Send your message again.");
  });

  it("should log a rejected secret", async () => {
    fetch.mockImplementation(() => respond({ success: false, "error-codes": ["invalid-input-secret"] }));
    expect((await verify("token")).success).toBe(false);
    expect(logErrorToFile).toHaveBeenCalled();
  });

  it("should fail closed when there's no secret or Cloudflare can't be reached", async () => {
    delete process.env.turnstileSecretKey;
    expect((await verify("token")).success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();

    process.env.turnstileSecretKey = "secret";
    fetch.mockImplementation(() => Promise.reject(new Error("network down")));
    expect(await verify("token")).toEqual({
      success: false,
      error: "Couldn't run the spam check. Please try again in a moment.",
    });
  });
});
