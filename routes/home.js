import express from "express";
import config from "config";
import words from "number-to-words";
import { RecaptchaV3 as Recaptcha } from "express-recaptcha";

import * as projects from "../services/projects.js";
import * as news from "../services/news.js";
import { listRecentPosts } from "../services/blog.js";
import { getSettings } from "../services/settings.js";
import { sendContactMessage } from "../utils/sendMail.js";

const ROUTER = express.Router();

const recaptcha = new Recaptcha(
  config.get("recaptchaSiteKey"),
  process.env.secretKey,
  {
    callback: "cb",
  }
);

ROUTER.get("/", recaptcha.middleware.render, async (req, res) => {
  const [featuredProjects, latestNews, projectCount] = await Promise.all([
    projects.listFeatured(),
    news.listLatestPublished(5),
    projects.countPublished(),
  ]);

  // Only query the blog if it's switched on, and hide the section if Ghost is unreachable
  let { showBlog } = await getSettings();
  let blogPosts;
  if (showBlog) {
    try {
      blogPosts = await listRecentPosts();
    } catch (ex) {
      console.log(ex.message);
      showBlog = false;
    }
  }

  return res.render("index", {
    title: "Ryan Malacina",
    projects: featuredProjects,
    captcha: res.recaptcha,
    siteKey: config.get("recaptchaSiteKey"),
    news: latestNews,
    showNews: latestNews.length > 0,
    showBlog: showBlog,
    blogPosts: blogPosts,
    blogURL: config.get("blogURL"),
    project_count: words.toWords(projectCount),
    csrfToken: res.locals._csrf,
  });
});

// Simple shape check; the reply goes to this address, so it only needs to look deliverable
const EMAIL_PATTERN = /^[^\s@<>()[\]\,;:"]+@[^\s@<>()[\]\,;:"]+\.[a-zA-Z]{2,}$/;

ROUTER.post("/send", recaptcha.middleware.verify, async (req, res) => {
  const values = {
    name: singleLine(req.body.name),
    email: singleLine(req.body.email),
    subject: singleLine(req.body.subject),
    message: asText(req.body.message),
  };

  const errors = [];
  const invalid = {};

  if (!values.name) {
    errors.push("Name is a required field.");
    invalid.name = true;
  }
  if (!values.email) {
    errors.push("Email is a required field.");
    invalid.email = true;
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.push("Please provide a valid email.");
    invalid.email = true;
  }
  if (!values.subject) {
    errors.push("Subject is a required field.");
    invalid.subject = true;
  }
  if (!values.message) {
    errors.push("Message is a required field.");
    invalid.message = true;
  }

  if (errors.length > 0) {
    return renderContactForm(res, { errors, invalid, values });
  }

  if (req.recaptcha.error) {
    return renderContactForm(res, { errors: [String(req.recaptcha.error)], values });
  }

  const sent = await sendContactMessage(
    values.email,
    `Email received on behalf of ${values.name}: ${values.subject}`,
    `Contact form email on behalf of: ${values.name} <${values.email}>\n\n----\n\n${values.message}`
  );

  if (sent) {
    return renderContactForm(res, {
      contactSent: "Message sent! I'll get back to you as soon as I can!",
    });
  }

  return renderContactForm(res, {
    errors: ["There was an error sending your message. Please try again later."],
    values,
  });
});

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// For values that end up in email headers (subject, Reply-To)
function singleLine(value) {
  return asText(value).replace(/[\r\n]+/g, " ");
}

function renderContactForm(res, context) {
  return res.render("partials/contact-form", {
    layout: false,
    csrfToken: res.locals._csrf,
    ...context,
  });
}

export { ROUTER as homeRoute };
