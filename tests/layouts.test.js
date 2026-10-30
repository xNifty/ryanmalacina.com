import path from "path";

import { createViewEngine } from "../utils/viewEngine.js";

// Requires a webpack build (dist/manifest.json); CI runs `npm run build` before tests
const hbs = createViewEngine();
const VIEWS = path.resolve("views");

const base = {
  navPages: { about: { path: "/about", label: "About" } },
  settings: { views: VIEWS },
  nonce: "test-nonce",
  csrfToken: "test-csrf",
  currentyear: 2026,
  turnstileSiteKey: "test-site-key",
  title: "Test",
};

// The about page as routes/pages.js renders it
const ABOUT = {
  section: "about",
  page: { key: "about", path: "/about", title: "About me", prompt: "cat about.md", timeline: [] },
  bodyHtml: "<p>Hey there</p>",
  isAbout: true,
};

function render(view, context = {}) {
  return hbs.renderView(path.join(VIEWS, `${view}.handlebars`), { ...base, ...context });
}

describe("layouts", () => {
  it("should render public pages on the new stylesheet with no old libraries or splash", async () => {
    const html = await render("page", ABOUT);
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
    const html = await render("page", { ...ABOUT, highlight: true });
    expect(html).toContain("highlight.min.js");
    expect(html).toContain('id="hljs-light"');
    expect(html).toContain('id="hljs-dark"');
  });

  it("should show account links and the admin link to a signed-in admin", async () => {
    const html = await render("page", { ...ABOUT, authenticated: true, isAdmin: true, realName: "Ryan" });
    expect(html).toContain('href="/profile">Profile</a>');
    expect(html).toMatch(/<form method="post" action="\/logout">\s*<input type="hidden" name="_csrf"/);
    expect(html).not.toContain('href="/logout"');
    expect(html).toContain('href="/admin">Admin</a>');
    expect(html).not.toContain('href="/login">Log in</a>');
  });

  it("should hide the login link when hideLogin is set", async () => {
    const html = await render("reset", { hideLogin: true });
    expect(html).not.toContain('href="/login">Log in</a>');
  });

  it("should show the blog link only while the blog is switched on", async () => {
    expect(await render("page", { ...ABOUT, displayBlogNav: true })).toContain('href="/blog/">Blog</a>');
    expect(await render("page", { ...ABOUT, displayBlogNav: false })).not.toContain('href="/blog/"');
  });

  it("should show flash messages escaped, except on the error page", async () => {
    const html = await render("page", { ...ABOUT, success: ["Saved <b>it</b>."], error: ["Nope."] });
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
    ["page", "main", ABOUT],
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
    ["admin/pages/index", "admin", { pages: [{ key: "now", label: "Now", path: "/now", isPublished: false }] }],
    ["admin/pages/edit", "admin", { page: { key: "about", label: "About", path: "/about", hasTimeline: true }, values: {} }],
    ["admin/settings", "admin", { values: {}, presets: [{ name: "A", light: "#000000", dark: "#ffffff" }], defaultAccents: {} }],
  ])("should render %s with the %s layout", async (view, layout, context) => {
    const html = await render(view, { layout, ...context });
    expect(html).toMatch(/<\/html>\s*$/);
  });
});

describe("personal touches", () => {
  it("should render the home terminal with escaped lines and the published pages", async () => {
    const html = await render("index", {
      projects: [],
      news: [],
      navPages: { about: {}, now: {} },
      heroLines: [{ key: "editor", value: "<vim>" }],
    });
    expect(html).toContain('data-pages="about now "');
    expect(html).toContain('<span class="terminal__key">editor</span><span class="terminal__sep">:</span> &lt;vim&gt;');
    expect(html).toContain('<form class="terminal__form" data-terminal-form hidden>');
  });

  it("should link now and uses only once they're published", async () => {
    const before = await render("page", ABOUT);
    expect(before).not.toContain('href="/now"');
    expect(before).not.toContain('href="/uses"');

    const after = await render("page", { ...ABOUT, navPages: { about: {}, now: {}, uses: {} } });
    expect(after).toContain('<a class="site-nav__link" href="/now">Now</a>');
    expect(after).toContain('<li><a href="/uses">Uses</a></li>');
    expect(after).toContain('<kbd>g</kbd> <kbd>u</kbd>');
  });

  it("should show a terminal on the 404 page with the escaped path", async () => {
    const html = await render("error", { error: "Gone", status_code: "404 - Not Found", requestPath: "/<b>nope" });
    expect(html).toContain("bash: cd: /&lt;b&gt;nope: No such file or directory");

    const serverError = await render("error", { error: "Oops", status_code: "500 - Server Error", requestPath: "/x" });
    expect(serverError).toContain("HTTP/1.1 500 - Server Error");
  });

  it("should show a project's status, years and GitHub details", async () => {
    const html = await render("projects", {
      projects: [
        {
          name: "GoTodo",
          title: "GoTodo",
          slug: "gotodo",
          image: "default.png",
          tags: [],
          status: "active",
          startYear: 2024,
          github: { stars: 1520, language: "Go", pushedAt: new Date(2026, 8, 1), archived: false },
        },
        { name: "Old", title: "Old", slug: "old", image: "default.png", tags: [], github: { stars: 0, archived: true } },
      ],
    });
    expect(html).toContain('<span class="status status--active">active</span>');
    expect(html).toContain('<span class="fact">2024–present</span>');
    expect(html).toContain('data-lang="Go"');
    expect(html).toContain("1.5k");
    expect(html).toContain("Sep 2026");
    // No status set, but the repo is archived
    expect(html).toContain('<span class="status status--archived">archived</span>');
  });

  it("should add link-preview tags and the accent override", async () => {
    const html = await render("page", {
      ...ABOUT,
      siteURL: "https://ryanmalacina.com",
      requestPath: "/about",
      description: "All about <me>",
      ogImage: "/og/page/about.png",
      accentCss: ':root[data-theme="dark"] { --accent: #a78bfa; }',
    });
    expect(html).toContain('<meta name="description" content="All about &lt;me&gt;">');
    expect(html).toContain('<meta property="og:image" content="https://ryanmalacina.com/og/page/about.png">');
    expect(html).toContain('<link rel="canonical" href="https://ryanmalacina.com/about">');
    expect(html).toContain('<style nonce="test-nonce">:root[data-theme="dark"] { --accent: #a78bfa; }</style>');
  });

  it("should show the running commit in the footer", async () => {
    const html = await render("page", {
      ...ABOUT,
      build: { short: "6021602", url: "https://github.com/xNifty/ryanmalacina.com/commit/6021602", date: new Date(2026, 9, 14) },
    });
    expect(html).toContain('<a href="https://github.com/xNifty/ryanmalacina.com/commit/6021602" title="The commit this site is running">6021602</a>');
    expect(html).toContain("Oct 14, 2026");
  });
});
