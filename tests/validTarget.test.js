import ValidTarget from "../utils/validTarget.js";

jest.mock("config", () => ({
  get: jest.fn(() => "http://localhost"),
}));

describe("ValidTarget", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return true if the path is a local URL", () => {
    const path = "http://localhost/some/path";
    const result = ValidTarget(path);
    expect(result).toBe(true);
  });

  it("should return false for external URL", () => {
    const path = "https://example.com";
    const result = ValidTarget(path);
    expect(result).toBe(false);
  });

  it("should return false for invalid or non-local URL", () => {
    const path = "fake_url_not_real";
    const result = ValidTarget(path);
    expect(result).toBe(false);
  });

  it("should return false for empty URL", () => {
    const path = "";
    const result = ValidTarget(path);
    expect(result).toBe(false);
  });
});
