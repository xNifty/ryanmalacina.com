import {
  validateProjectForm,
  validateNewsForm,
  validatePageForm,
  validateSettingsForm,
  parseTimeline,
  formatTimeline,
  parseHeroLines,
} from "../utils/validation.js";

const goodProject = {
  name: "  Snoring Ninja  ",
  title: "Snoring Ninja Bot",
  slug: "",
  source: "https://github.com/xNifty/snoring",
  descriptionMarkdown: "A description that is long enough.",
  isPublished: "on",
  _csrf: "token",
};

describe("validateProjectForm", () => {
  it("should clean a valid form", () => {
    const { value, errors } = validateProjectForm(goodProject);
    expect(errors).toBeNull();
    expect(value).toEqual({
      name: "Snoring Ninja",
      title: "Snoring Ninja Bot",
      slug: "",
      source: "https://github.com/xNifty/snoring",
      descriptionMarkdown: "A description that is long enough.",
      tags: [],
      status: "",
      startYear: null,
      endYear: null,
      isPublished: true,
    });
  });

  it("should treat a missing checkbox as unpublished", () => {
    const { isPublished, ...rest } = goodProject;
    expect(validateProjectForm(rest).value.isPublished).toBe(false);
  });

  it("should report one readable message per bad field", () => {
    const { errors } = validateProjectForm({
      ...goodProject,
      name: "",
      slug: "Not A Slug!",
      source: "javascript:alert(1)",
      descriptionMarkdown: "short",
    });
    expect(errors).toEqual({
      name: "Name is required.",
      slug: "Slug may only contain lowercase letters, numbers and single hyphens.",
      source: "Source URL must be a full URL, e.g. https://github.com/you/project.",
      descriptionMarkdown: "Description must be at least 20 characters.",
    });
  });

  it("should lowercase slugs", () => {
    expect(validateProjectForm({ ...goodProject, slug: "My-Slug" }).value.slug).toBe("my-slug");
  });
});

describe("project tags", () => {
  it("should split, tidy and de-duplicate tags", () => {
    const { value, errors } = validateProjectForm({ ...goodProject, tags: "Node, Discord Bot, node, C#" });
    expect(errors).toBeNull();
    expect(value.tags).toEqual(["node", "discord-bot", "c#"]);
  });

  it("should reject too many tags or unusable characters", () => {
    expect(validateProjectForm({ ...goodProject, tags: "a,b,c,d,e,f,g" }).errors.tags).toBe("Use at most 6 tags.");
    expect(validateProjectForm({ ...goodProject, tags: "ok, <script>" }).errors.tags).toMatch(/isn.t a usable tag/);
  });
});

describe("validateNewsForm", () => {
  it("should accept a valid post and flag a long body", () => {
    expect(validateNewsForm({ title: "Hi", bodyMarkdown: "Long enough body" }).errors).toBeNull();
    expect(validateNewsForm({ title: "Hi", bodyMarkdown: "x".repeat(1001) }).errors).toEqual({
      bodyMarkdown: "Body must be 1000 characters or fewer.",
    });
  });
});

describe("project status and years", () => {
  it("should accept a status and a year range", () => {
    const { value, errors } = validateProjectForm({ ...goodProject, status: "active", startYear: "2019", endYear: "" });
    expect(errors).toBeNull();
    expect(value).toMatchObject({ status: "active", startYear: 2019, endYear: null });
  });

  it("should reject unknown statuses and backwards years", () => {
    const { errors } = validateProjectForm({ ...goodProject, status: "deleted", startYear: "2020", endYear: "2019" });
    expect(errors).toEqual({
      status: "Pick a status from the list.",
      endYear: "Ended can't be before Started.",
    });
    expect(validateProjectForm({ ...goodProject, startYear: "soon" }).errors).toEqual({
      startYear: "Started must be a year, e.g. 2019.",
    });
  });
});

describe("validatePageForm", () => {
  it("should parse the timeline", () => {
    const { value, errors } = validatePageForm({
      title: " About ",
      bodyMarkdown: "Hi",
      timeline: "2019 – now | Developer | SQL | ASP.NET\r\n\r\n2015 | Started",
      isPublished: "on",
    });
    expect(errors).toBeNull();
    expect(value).toEqual({
      title: "About",
      intro: "",
      bodyMarkdown: "Hi",
      timeline: [
        { when: "2019 – now", what: "Developer", detail: "SQL | ASP.NET" },
        { when: "2015", what: "Started", detail: "" },
      ],
      isPublished: true,
    });
  });

  it("should point at the bad timeline line", () => {
    const { errors } = validatePageForm({ title: "A", bodyMarkdown: "B", timeline: "2019 | ok\nnope" });
    expect(errors.timeline).toMatch(/^Line 2: write it as/);
  });

  it("should round-trip through formatTimeline", () => {
    const text = "2019 | Developer | SQL\n2015 | Started";
    expect(formatTimeline(parseTimeline(text))).toBe(text);
  });
});

describe("validateSettingsForm", () => {
  it("should clean colours and keep the terminal lines", () => {
    const { value, errors } = validateSettingsForm({
      showBlog: "on",
      accentLight: " #6D28D9 ",
      accentDark: "",
      heroLines: "editor: VS Code\nfocus: Go: the language",
    });
    expect(errors).toBeNull();
    expect(value).toEqual({
      showBlog: true,
      accentLight: "#6d28d9",
      accentDark: "",
      heroLines: "editor: VS Code\nfocus: Go: the language",
    });
    expect(parseHeroLines(value.heroLines)).toEqual([
      { key: "editor", value: "VS Code" },
      { key: "focus", value: "Go: the language" },
    ]);
  });

  it("should reject colours that aren't #rrggbb and lines without keys", () => {
    const { errors } = validateSettingsForm({ accentLight: "purple", accentDark: "#abc", heroLines: "no key" });
    expect(errors).toEqual({
      accentLight: "Light theme accent must be a colour like #3ddc84.",
      accentDark: "Dark theme accent must be a colour like #3ddc84.",
      heroLines: "Line 1: write it as “key: value”, with a key of up to 20 characters and a value of up to 80.",
    });
  });
});
