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

  it("should show errors, mark invalid fields and keep escaped values", async () => {
    const html = await render("partials/contact-form", {
      errors: ["Name is a required field.", "Please provide a valid email."],
      invalid: { name: true, email: true },
      values: { email: XSS, message: "</textarea>" + XSS },
    });
    expect(html).toContain("emailalert-visible");
    expect(html).toContain("Name is a required field.<br>Please provide a valid email.");
    expect(html).toContain('class="form-control invalid" placeholder="John Doe"');
    expect(html).toContain('class="form-control invalid" placeholder="you@your.email"');
    expect(html).toContain('class="form-control" placeholder="Hello!"');
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;/textarea&gt;");
  });

  it("should replace the form with the success message once sent", async () => {
    const html = await render("partials/contact-form", { contactSent: "Message sent!" });
    expect(html).toContain("alert-success");
    expect(html).toContain("Message sent!");
    expect(html).not.toContain('id="contact-form"');
  });
});

describe("alert partials", () => {
  it.each(["partials/alert", "partials/modal-alert"])("%s should escape each line", async (view) => {
    const html = await render(view, { type: "danger", messages: ["One", XSS] });
    expect(html).toContain("alert-danger");
    expect(html).toContain("One<br>");
    expect(html).not.toContain("<script>");
  });
});

describe("delete modal partial", () => {
  it("should escape the action and token", async () => {
    const html = await render("partials/delete-modal", {
      action: "/projects/delete/" + encodeURIComponent(XSS),
      csrfToken: XSS,
    });
    expect(html).toContain('hx-put="/projects/delete/%22%3E%3Cscript%3E');
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
