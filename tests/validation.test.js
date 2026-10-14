import { validateProjectForm, validateNewsForm } from "../utils/validation.js";

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
