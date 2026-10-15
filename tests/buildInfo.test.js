import { getBuildInfo } from "../utils/buildInfo.js";

describe("getBuildInfo", () => {
  it("should prefer GIT_COMMIT from the environment", () => {
    const info = getBuildInfo({ GIT_COMMIT: "6021602abcdef0123456789", GIT_COMMIT_DATE: "2026-10-14T10:00:00Z" });
    expect(info).toEqual({
      commit: "6021602abcdef0123456789",
      short: "6021602",
      date: new Date("2026-10-14T10:00:00Z"),
      url: "https://github.com/xNifty/ryanmalacina.com/commit/6021602abcdef0123456789",
    });
  });

  it("should ignore values that aren't commit hashes", () => {
    expect(getBuildInfo({ GIT_COMMIT: "<script>" })).toBeNull();
  });

  it("should read git when nothing is set", () => {
    // The tests run inside the repository
    expect(getBuildInfo({})?.short).toMatch(/^[0-9a-f]{7}$/);
  });
});
