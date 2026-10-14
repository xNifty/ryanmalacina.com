import path from "path";

import { createViewEngine } from "../utils/viewEngine.js";

// Requires a webpack build (dist/manifest.json); CI runs `npm run build` before tests
const hbs = createViewEngine();
const VIEWS = path.resolve("views");

const base = {
  settings: { views: VIEWS },
  nonce: "test-nonce",
  csrfToken: "test-csrf",
  currentyear: 2026,
  recaptchaSiteKey: "test-site-key",
  title: "Test",
};

function render(view, context = {}) {
  return hbs.renderView(path.join(VIEWS, `${view}.handlebars`), { ...base, ...context });
}

describe("layouts", () => {
  it("should render public pages on the new stylesheet with no old libraries or splash", async () => {
    const html = await render("about", { section: "about" });
    expect(html).toContain("/css/site.css");
    expect(html).toContain("fonts.googleapis.com/css2?family=Inter");
    expect(html).toContain("trustedtype.js");
    expect(html).toContain('href="/login">Log in</a>');
    expect(html).toContain('<a class="site-nav__link" href="/about" aria-current="page">About</a>');
    expect(html).not.toMatch(/bootstrap|jquery|font-awesome|glyphicon|siteSplash|welcome\.js|loginModal/i);
    // Highlighting is only loaded where a page asks for it
    expect(html).not.toContain("highlight.min.js");
  });

  it("should load highlight.js and its themes only when asked", async () => {
    const html = await render("about", { highlight: true });
    expect(html).toContain("highlight.min.js");
    expect(html).toContain('id="hljs-light"');
    expect(html).toContain('id="hljs-dark"');
  });

  it("should show account links and the admin link to a signed-in admin", async () => {
    const html = await render("about", { authenticated: true, isAdmin: true, realName: "Ryan" });
    expect(html).toContain('href="/profile">Profile</a>');
    expect(html).toContain('href="/logout">Log out</a>');
    expect(html).toContain('href="/admin">Admin</a>');
    expect(html).not.toContain('href="/login">Log in</a>');
  });

  it("should hide the login link when hideLogin is set", async () => {
    const html = await render("reset", { hideLogin: true });
    expect(html).not.toContain('href="/login">Log in</a>');
  });

  it("should show the blog link only while the blog is switched on", async () => {
    expect(await render("about", { displayBlogNav: true })).toContain('href="/blog/">Blog</a>');
    expect(await render("about", { displayBlogNav: false })).not.toContain('href="/blog/"');
  });

  it("should show flash messages escaped, except on the error page", async () => {
    const html = await render("about", { success: ["Saved <b>it</b>."], error: ["Nope."] });
    expect(html).toContain("Saved &lt;b&gt;it&lt;/b&gt;.");
    expect(html).toMatch(/class="flash flash--error" role="alert"/);

    const errorPage = await render("error", { error: "Not here", status_code: "404 - Not Found" });
    expect(errorPage).not.toContain('class="flash');
    expect(errorPage).toContain("404 - Not Found");
  });

  it("should render admin pages without Bootstrap, jQuery or the public extras", async () => {
    const html = await render("admin/news/index", {
      layout: "admin",
      section: "news",
      tabs: [],
      news: [],
    });
    expect(html).toContain("/css/admin.css");
    expect(html).toContain("/js/admin.js");
    expect(html).toContain("htmx.min.js");
    expect(html).toContain("trustedtype.js");
    expect(html).toContain('hx-headers=\'{"X-CSRF-Token": "test-csrf"}\'');
    expect(html).toMatch(/<a href="\/admin\/news" aria-current="page">News<\/a>/);
    expect(html).not.toMatch(/bootstrap|jquery|simplemde/i);
    expect(html).not.toContain('id="siteSplash"');
  });

  it("should show flash messages as escaped toasts in the admin", async () => {
    const html = await render("admin/dashboard", {
      layout: "admin",
      projectStats: {},
      newsStats: {},
      recent: [],
      success: ["Saved <b>it</b>."],
      error: ["Nope."],
    });
    expect(html).toContain('class="toast toast--success"');
    expect(html).toContain("Saved &lt;b&gt;it&lt;/b&gt;.");
    expect(html).toMatch(/class="toast toast--error" role="alert"/);
  });

  it("should load page scripts with the request nonce", async () => {
    const html = await render("profile", { pageScripts: ["profile.js"] });
    // Handlebars escapes "=" as &#x3D; inside attributes; browsers decode it
    expect(html).toMatch(/<script src="\/js\/profile\.js\?v(=|&#x3D;)[0-9a-f]+" nonce="test-nonce">/);
  });

  it("should escape stored markdown inside the editor textarea", async () => {
    const html = await render("admin/projects/edit", {
      layout: "admin",
      project: { _id: "abc", name: "x" },
      values: { descriptionMarkdown: "</textarea><script>alert(1)</script>" },
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;/textarea&gt;");
  });

  it("should show field errors next to their fields in the editor", async () => {
    const html = await render("admin/projects/edit", {
      layout: "admin",
      isNew: true,
      action: "/admin/projects",
      draftKey: "project:new",
      values: { name: "Kept value" },
      errors: { slug: "Slug may only contain lowercase letters, numbers and single hyphens." },
    });
    expect(html).toContain("Nothing was saved. Fix the highlighted fields and try again.");
    expect(html).toContain('value="Kept value"');
    expect(html).toMatch(/id="field-slug"[^>]*aria-invalid="true"/);
    expect(html).toContain('<p class="field__error" id="field-slug-error">Slug may only contain');
    expect(html).not.toMatch(/id="field-name"[^>]*aria-invalid/);
    expect(html).toContain('data-draft-key="project:new"');
    expect(html).toContain('hx-post="/admin/preview/project"');
  });

  it("should render a project page from the stored fields", async () => {
    const html = await render("projects", {
      is_valid: true,
      authenticated: true,
      isAdmin: true,
      project: {
        _id: "abc123",
        name: "Snoring Ninja",
        title: "Snoring Ninja Bot",
        tags: ["node", "discord"],
        source: "https://github.com/xNifty/snoring",
        updatedAt: new Date(2026, 9, 14, 15, 5),
      },
      descriptionHtml: "<p>Body</p>",
    });
    expect(html).toContain('<h1 class="article__title">Snoring Ninja</h1>');
    expect(html).toContain('<p class="article__subtitle">Snoring Ninja Bot</p>');
    expect(html).toContain('<li class="tag">discord</li>');
    expect(html).toContain('href="https://github.com/xNifty/snoring"');
    expect(html).toContain("Oct 14, 2026");
    expect(html).toContain('href="/admin/projects/abc123/edit"');
    expect(html).toContain("<p>Body</p>");
  });

  it("should render the home page from the new fields", async () => {
    const html = await render("index", {
      project_count: "two",
      projects: [
        { name: "Snoring Ninja", title: "Snoring Ninja Bot", slug: "ninja", image: "default.png", tags: ["node"] },
        { name: "GoTodo", title: "GoTodo", slug: "gotodo", image: "gotodo.png", tags: [] },
      ],
      showNews: true,
      news: [{ title: "Launch", slug: "launch", bodyHtml: "<p>We're live</p>", publishedAt: new Date(2026, 5, 10, 7, 52) }],
    });
    expect(html).toContain('<a href="/projects/ninja">Snoring Ninja</a>');
    // The placeholder image becomes a monogram; a real one is shown
    expect(html).toContain('<span class="monogram" aria-hidden="true">SN</span>');
    expect(html).toContain('src="/images/gotodo.png"');
    expect(html).not.toContain("default.png");
    // A title identical to the name isn't repeated
    expect(html).not.toContain('<p class="project-card__title">GoTodo</p>');
    expect(html).toContain("all two projects");
    // News entries expand in place, with a link to their own page
    expect(html).toContain('<span class="post-row__title">Launch</span>');
    expect(html).toContain("<p>We're live</p>");
    expect(html).toContain('<a class="post-entry__link" href="/news/launch">permalink →</a>');
    expect(html).toContain("Jun 10, 2026");
    expect(html).toContain('id="contactformdiv"');
    expect(html).not.toContain("from the blog");
  });

  it("should render news results with escaped, highlighted titles and a pager", async () => {
    const html = await render("partials/news/results", {
      layout: false,
      q: "launch",
      totalItems: 1,
      news: [{ slug: "launch", titleHtml: "Site <mark>launch</mark> &#60;3", bodyHtml: "<p>Live</p>", publishedAt: new Date(2026, 5, 10) }],
      pagination: { page: 1, totalPages: 2, prev: null, next: "/news?q=launch&page=2" },
    });
    expect(html).toContain("1 post matches “launch”");
    expect(html).toContain("Site <mark>launch</mark> &#60;3");
    expect(html).toContain('hx-get="/news?q&#x3D;launch&amp;page&#x3D;2"');
    expect(html).toContain("page 1 of 2");
  });

  it.each([
    ["index", "main", { projects: [], news: [] }],
    ["about", "main", {}],
    ["projects", "main", { projects: [] }],
    ["login", "main", {}],
    ["error", "main", { error: "x" }],
    ["keybase", "main", {}],
    ["news-index", "main", { news: [], sorts: [], pagination: {} }],
    ["news-post", "main", { post: { title: "A", bodyHtml: "<p>b</p>", publishedAt: new Date() } }],
    ["profile", "main", { pageScripts: ["profile.js"] }],
    ["reset", "main", { hideLogin: true }],
    ["resetPassword", "main", { hideLogin: true }],
    ["admin/dashboard", "admin", { projectStats: {}, newsStats: {}, recent: [] }],
    ["admin/projects/index", "admin", { tabs: [], projects: [{ _id: "1", name: "A", title: "B", slug: "a", image: "a.png", isPublished: true, featured: true, updatedAt: new Date() }] }],
    ["admin/projects/edit", "admin", { isNew: true, values: {} }],
    ["admin/news/index", "admin", { tabs: [], news: [{ _id: "1", title: "A", isPublished: false, updatedAt: new Date() }] }],
    ["admin/news/edit", "admin", { entry: { _id: "1", title: "A", isPublished: true, publishedAt: new Date() }, values: {} }],
  ])("should render %s with the %s layout", async (view, layout, context) => {
    const html = await render(view, { layout, ...context });
    expect(html).toMatch(/<\/html>\s*$/);
  });
});
