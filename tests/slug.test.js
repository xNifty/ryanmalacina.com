import { slugify, uniqueSlug } from "../utils/slug.js";
import { formatDate } from "../utils/helpers.js";

describe("slugify", () => {
  it.each([
    ["My Cool Project!", "my-cool-project"],
    ["  Spaces   everywhere  ", "spaces-everywhere"],
    ["Café & Crème", "cafe-and-creme"],
    ["C#", "c"],
    ["v2.0 release", "v2-0-release"],
  ])("%s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("should fall back when nothing usable is left", () => {
    expect(slugify("!!!", "project")).toBe("project");
    expect(slugify(undefined, "news")).toBe("news");
  });

  it("should cap the length without a trailing hyphen", () => {
    const slug = slugify("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("should number collisions", async () => {
    const taken = new Set(["c", "c-2"]);
    expect(await uniqueSlug("c", async (s) => taken.has(s))).toBe("c-3");
    expect(await uniqueSlug("free", async (s) => taken.has(s))).toBe("free");
  });
});

describe("formatDate", () => {
  it("should format dates in the site's style", () => {
    expect(formatDate(new Date(2026, 9, 14, 15, 5))).toBe("October 14, 2026 @ 3:05 PM");
    expect(formatDate(new Date(2026, 9, 14), "yyyy-mm-dd")).toBe("2026-10-14");
  });

  it("should render nothing for missing or invalid dates", () => {
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("not a date")).toBe("");
  });
});
