import express from "express";
import config from "config";
import GhostContentAPI from "@tryghost/content-api";
import dateFormat from "dateformat";
import words from "number-to-words";
import { RecaptchaV3 as Recaptcha } from "express-recaptcha";

import { Project } from "../models/projects.js";
import { News } from "../models/news.js";
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
  let project_list = await listProjects();
  let news_list = await listNews();
  var project_count = await getProjectCount();
  var posts;
  var showNews;

  var showBlog = config.get("showBlog");

  // only bother querying the blog if we have this set to true
  if (showBlog) {
    try {
      posts = await getBlogPosts();
      for (var x in posts) {
        let counter_number = x;
        let date = posts[x].published_at;
        //console.log(date);
        counter_number++;
        posts[x].counter = counter_number;
        posts[x].formatted_date =
          dateFormat(date, "mmmm dS, yyyy") +
          " @ " +
          dateFormat(date, "h:MM TT");
      }
    } catch (ex) {
      console.log(ex.message);
      showBlog = false;
    }
  }

  for (var count in news_list) {
    let counter_number = count;
    counter_number++;
    news_list[count].counter = counter_number;
  }

  if (news_list.length === 0) {
    showNews = false;
  } else {
    showNews = true;
  }

  return res.render("index", {
    title: "Ryan Malacina | Home",
    projects: project_list,
    captcha: res.recaptcha,
    siteKey: config.get("recaptchaSiteKey"),
    news: news_list,
    showBlog: showBlog,
    blogPosts: posts,
    blogURL: config.get("blogURL"),
    project_count: words.toWords(project_count),
    showNews: showNews,
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

async function listProjects() {
  return Project.find({ show_index: 1, is_published: 1 })
    .select({
      project_name: 1,
      project_image: 1,
      project_title: 1,
      _id: 1,
    })
    .lean();
}

// Return count of published projects since we only show 3 on the index and I'd like to
// list how many published projects there are
async function getProjectCount() {
  return Project.find({ is_published: 1 }).countDocuments();
}

async function listNews() {
  return News.find({ is_published: 1 })
    .select({
      news_title: 1,
      published_date: 1,
      news_description_html: 1,
      _id: 0,
    })
    .limit(5)
    .sort({ _id: -1 })
    .lean();
}

async function getBlogPosts() {
  const ghost = new GhostContentAPI({
    url: config.get("blogURL"),
    key: process.env.blogAPI,
    version: config.get("blogVersion"),
  });

  return ghost.posts.browse({
    filter: "visibility: public",
    limit: 5,
    order: "published_at desc",
  });
}

export { ROUTER as homeRoute };
