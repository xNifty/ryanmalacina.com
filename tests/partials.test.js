import path from "path";

import { createViewEngine } from "../utils/viewEngine.js";
import { renderEmail } from "../utils/renderEmail.js";

const hbs = createViewEngine();
const VIEWS = path.resolve("views");

function render(view, context = {}) {
  return hbs.render(path.join(VIEWS, `${view}.handlebars`), {
    settings: { views: VIEWS },
    ...context,
  });
}

const XSS = '"><script>alert(1)</script>';

describe("contact form partial", () => {
  it("should render an empty form with no visible errors", async () => {
    const html = await render("partials/contact-form", { csrfToken: "t" });
    expect(html).toContain('id="contact-form"');
    expect(html).toContain('<span id="emailerror"></span>');
    expect(html).not.toContain("emailalert-visible");
    expect(html).not.toContain(" invalid");
  });

  it("should use Cloudflare Turnstile, with no reCAPTCHA or Google notice", async () => {
    const html = await render("partials/contact-form", { csrfToken: "t", turnstileSiteKey: "0x4AAA" });
    expect(html).toContain('<div class="turnstile" data-turnstile data-sitekey="0x4AAA"></div>');
    expect(html).not.toMatch(/recaptcha|google/i);
  });

  it("should show errors, mark invalid fields and keep escaped values", async () => {
    const html = await render("partials/contact-form", {
      errors: ["Name is a required field.", "Please provide a valid email."],
      invalid: { name: true, email: true },
      values: { email: XSS, message: "</textarea>" + XSS },
    });
    expect(html).toContain("emailalert-visible");
    expect(html).toContain("Name is a required field.<br>Please provide a valid email.");
    expect(html).toMatch(/id="name" name="name" class="input invalid"[^>]*aria-invalid="true"/);
    expect(html).toMatch(/id="email" name="email" class="input invalid"/);
    expect(html).toMatch(/id="subject" name="subject" class="input"[^>]*>/);
    expect(html).not.toMatch(/id="subject"[^>]*aria-invalid/);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;/textarea&gt;");
  });

  it("should replace the form with the success message once sent", async () => {
    const html = await render("partials/contact-form", { contactSent: "Message sent!" });
    expect(html).toContain("alert--success");
    expect(html).toContain("Message sent!");
    expect(html).not.toContain('id="contact-form"');
  });
});

describe("alert partials", () => {
  it.each(["partials/alert", "partials/modal-alert"])("%s should escape each line", async (view) => {
    const html = await render(view, { type: "danger", messages: ["One", XSS] });
    expect(html).toContain('class="form-message" role="alert"');
    expect(html).toContain("One<br>");
    expect(html).not.toContain("<script>");
  });
});

describe("admin row responses", () => {
  const project = {
    _id: "abc",
    name: XSS,
    title: "Title",
    slug: "slug",
    image: "a.png",
    isPublished: false,
    featured: true,
    updatedAt: new Date(2026, 9, 14),
  };

  it("should return the row with escaped values and the right actions", async () => {
    const html = await render("partials/admin/row-response", { rowPartial: "admin/project-row", item: project });
    expect(html).toMatch(/^\s*<tr id="project-abc">/);
    expect(html).toContain('hx-put="/admin/projects/abc/publish"');
    expect(html).not.toContain("/unpublish");
    expect(html).toContain('aria-checked="true"');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("hx-swap-oob");
  });

  it("should add an out-of-band toast, and send no row when one was deleted", async () => {
    const html = await render("partials/admin/row-response", {
      toast: { type: "success", message: "Deleted “x”." },
    });
    expect(html).not.toContain("<tr");
    expect(html).toContain('<div id="toasts" hx-swap-oob="beforeend">');
    expect(html).toContain("Deleted “x”.");
  });

  it("should label service health for screen readers as well as by colour", async () => {
    const html = await render("partials/admin/health", {
      services: [
        { name: "Database", status: "ok", detail: "Connected" },
        { name: "Blog (Ghost)", status: "error", detail: XSS },
      ],
    });
    expect(html).toMatch(/health--ok[\s\S]*OK/);
    expect(html).toMatch(/health--error[\s\S]*Problem/);
    expect(html).not.toContain("<script>");
  });
});

describe("emails", () => {
  it("should render the reset email with escaped values", async () => {
    const html = await renderEmail("passwordReset", {
      user: "<b>Ryan</b>",
      link: "https://example.com/reset?token=a&id=b",
      invalidateLink: "https://example.com/invalidate",
    });
    expect(html).toContain("Hello, &lt;b&gt;Ryan&lt;/b&gt;,");
    expect(html).toContain('href="https://example.com/reset?token&#x3D;a&amp;id&#x3D;b"');
  });

  it("should render the password-changed email", async () => {
    const html = await renderEmail("passwordResetSuccess", { user: "Ryan" });
    expect(html).toContain("Hello, Ryan,");
  });
});
