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
  it("should render public pages with the login modal, highlight.js and the splash", async () => {
    const html = await render("about", { showSplashScreen: true });
    expect(html).toContain('id="loginModal"');
    expect(html).toContain("highlight.min.js");
    expect(html).toContain('id="siteSplash"');
    expect(html).toContain("welcome.js");
    expect(html).not.toContain("simplemde");
  });

  it("should drop the login modal for signed-in users", async () => {
    const html = await render("about", { authenticated: true, realName: "Ryan" });
    expect(html).not.toContain('id="loginModal"');
    expect(html).toContain("Hello, Ryan");
  });

  it("should hide all login UI when hideLogin is set", async () => {
    const html = await render("reset", { hideLogin: true });
    expect(html).not.toContain('id="loginModal"');
    expect(html).not.toContain('data-csp-modal-open="loginModal"');
  });

  it("should render admin pages with the editor and modal target, without public extras", async () => {
    const html = await render("admin/news/news", {
      layout: "admin",
      markdownEditor: true,
      authenticated: true,
      isAdmin: true,
      news: [],
    });
    expect(html).toContain("simplemde@1.11.2/dist/simplemde.min.js");
    expect(html).toContain("simplemde@1.11.2/dist/simplemde.min.css");
    expect(html).toContain("/js/editor.js");
    expect(html).toContain("/js/admin.js");
    expect(html).toContain('id="confirmation-modal"');
    expect(html).toContain("data-markdown-editor");
    expect(html).not.toContain('id="siteSplash"');
    expect(html).not.toContain("welcome.js");
  });

  it("should load page scripts with the request nonce", async () => {
    const html = await render("news-index", {
      pageScripts: ["jquery.simplePagination.js", "news.js"],
    });
    // Handlebars escapes "=" as &#x3D; inside attributes; browsers decode it
    expect(html).toMatch(/<script src="\/js\/news\.js\?v(=|&#x3D;)[0-9a-f]+" nonce="test-nonce">/);
    expect(html).toMatch(/jquery\.simplePagination\.js\?v(=|&#x3D;)[0-9a-f]+"/);
  });

  it("should load exactly one jQuery", async () => {
    for (const [view, layout] of [["about", "main"], ["admin", "admin"]]) {
      const html = await render(view, { layout });
      expect(html.match(/jquery-[\d.]+\.min\.js/g)).toEqual(["jquery-3.3.1.min.js"]);
    }
  });

  it("should escape stored markdown inside the project editor textarea", async () => {
    const html = await render("admin/projects/update-project", {
      layout: "admin",
      markdownEditor: true,
      project_description: "</textarea><script>alert(1)</script>",
      id: "abc",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;/textarea&gt;");
  });

  it("should render a project page from the stored fields", async () => {
    const html = await render("projects", {
      is_valid: true,
      authenticated: true,
      isAdmin: true,
      project: {
        _id: "abc123",
        title: "Snoring Ninja Bot",
        source: "https://github.com/xNifty/snoring",
        updatedAt: new Date(2026, 9, 14, 15, 5),
      },
      descriptionHtml: "<p>Body</p>",
    });
    expect(html).toContain("<h1>Snoring Ninja Bot</h1>");
    expect(html).toContain('href="https://github.com/xNifty/snoring"');
    expect(html).toContain("Updated October 14, 2026 @ 3:05 PM");
    expect(html).toContain('href="/projects/abc123/edit"');
    expect(html).toContain("<p>Body</p>");
  });

  it("should link project cards and show news dates from the new fields", async () => {
    const html = await render("index", {
      projects: [{ name: "Ninja", title: "Ninja Bot", slug: "ninja", image: "ninja.png" }],
      showNews: true,
      news: [{ title: "Launch", bodyHtml: "<p>Live</p>", publishedAt: new Date(2026, 5, 10, 7, 52) }],
    });
    expect(html).toContain('href="/projects/ninja"');
    expect(html).toContain('src="/images/ninja.png"');
    expect(html).toContain("Launch | June 10, 2026 @ 7:52 AM");
  });

  it.each([
    ["index", "main", { projects: [], news: [] }],
    ["about", "main", {}],
    ["projects", "main", { projects: [] }],
    ["login", "main", {}],
    ["error", "main", { error: "x" }],
    ["keybase", "main", {}],
    ["news-index", "main", { news: [] }],
    ["profile", "main", { pageScripts: ["profile.js"] }],
    ["reset", "main", { hideLogin: true }],
    ["resetPassword", "main", { hideLogin: true }],
    ["admin", "admin", {}],
    ["admin/projects/projects", "admin", { projects: [] }],
    ["admin/projects/new-project", "admin", { markdownEditor: true }],
    ["admin/projects/update-project", "admin", { markdownEditor: true, pageScripts: ["update-project.js"] }],
    ["admin/news/news", "admin", { markdownEditor: true, news: [] }],
    ["admin/news/edit", "admin", { markdownEditor: true }],
  ])("should render %s with the %s layout", async (view, layout, context) => {
    const html = await render(view, { layout, ...context });
    expect(html).toMatch(/<\/html>\s*$/);
  });
});
