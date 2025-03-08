import express from "express";
import config from "config";
import GhostContentAPI from "@tryghost/content-api";
import dateFormat from "dateformat";
import words from "number-to-words";
import { RecaptchaV3 as Recaptcha } from "express-recaptcha";
import fs from "fs";
import path from "path";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

import { Project } from "../models/projects.js";
import { News } from "../models/news.js";
import { sendMail } from "../utils/sendMail.js";

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

ROUTER.post("/send", recaptcha.middleware.verify, async (req, res) => {
  let fromEmail = req.body.email;
  let toEmail = process.env.mailgunToEmail;
  let subject = req.body.subject;
  let message = req.body.message;
  let subject_name = req.body.name;

  let subject_combined =
    `Email received on behalf of ${subject_name}:\n ` + subject;
  let messaged_combined =
    `Contact form email on behalf of: ${subject_name}\n\n----\n\n` + message;

  let errors = "";
  let badEmail = false;

  // Validate name
  if (!subject_name) {
    errors += "Name is a required field.<br>";
  }

  // Validate email
  if (!fromEmail) {
    errors += "Email is a required field.<br>";
  } else {
    let re =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!re.test(fromEmail)) {
      errors += "Please provide a valid email.<br>";

      badEmail = true;
    }
  }

  // Validate subject
  if (!subject) {
    errors += "Subject is a required field.<br>";
  }

  // Validate message
  if (!message) {
    errors += "Message is a required field.";
  }

  const __dirname = path.resolve();

  const errorFile = path.join(
    __dirname,
    "/views/layouts/templates/contact/error.handlebars"
  );
  const errorSource = fs.readFileSync(errorFile, "utf-8").toString();

  const successFile = path.join(
    __dirname,
    "/views/layouts/templates/contact/success.handlebars"
  );
  const successSource = fs.readFileSync(successFile, "utf-8").toString();

  var template;

  if (errors !== "") {
    template = errorSource;

    const window = new JSDOM("").window;
    const DOMPurify = createDOMPurify(window);

    let sanitizedErrors = DOMPurify.sanitize(errors);
    let sanitizedSubject = DOMPurify.sanitize(subject);
    let sanitizedSubjectName = DOMPurify.sanitize(subject_name);
    let sanitizedFromEmail = DOMPurify.sanitize(fromEmail);
    let sanitizedMessage = DOMPurify.sanitize(message);
    let sanitizedCSRFToken = DOMPurify.sanitize(res.locals._csrf);

    template = template.replace("{{contacterrors}}", sanitizedErrors);

    if (subject_name) {
      template = template.replace(
        '<input type="text" id="name" name="name" class="form-control" placeholder="John Doe" autocomplete="off">',
        `<input type="text" id="name" name="name" class="form-control" placeholder="John Doe" autocomplete="off" value="${sanitizedSubjectName}">`
      );
    } else {
      template = template.replace(
        '<input type="text" id="name" name="name" class="form-control" placeholder="John Doe" autocomplete="off">',
        `<input type="text" id="name" name="name" class="form-control invalid" placeholder="John Doe" autocomplete="off">`
      );
    }

    if (subject) {
      template = template.replace(
        '<input type="text" id="subject" name="subject" class="form-control" placeholder="Hello!" autocomplete="off">',
        `<input type="text" id="subject" name="subject" class="form-control" placeholder="Hello!" autocomplete="off" value="${sanitizedSubject}">`
      );
    } else {
      template = template.replace(
        '<input type="text" id="subject" name="subject" class="form-control" placeholder="Hello!" autocomplete="off">',
        `<input type="text" id="subject" name="subject" class="form-control invalid" placeholder="Hello!" autocomplete="off">`
      );
    }

    if (fromEmail && !badEmail) {
      template = template.replace(
        '<input type="text" id="email" name="email" class="form-control" placeholder="you@your.email" autocomplete="on">',
        `<input type="text" id="email" name="email" class="form-control" placeholder="you@your.email" autocomplete="on" value="${sanitizedFromEmail}">`
      );
    } else {
      if (fromEmail && badEmail) {
        template = template.replace(
          '<input type="text" id="email" name="email" class="form-control" placeholder="you@your.email" autocomplete="on">',
          `<input type="text" id="email" name="email" class="form-control invalid" placeholder="you@your.email" autocomplete="on" value="${sanitizedFromEmail}">`
        );
      } else {
        template = template.replace(
          '<input type="text" id="email" name="email" class="form-control" placeholder="you@your.email" autocomplete="on">',
          `<input type="text" id="email" name="email" class="form-control invalid" placeholder="you@your.email" autocomplete="on">`
        );
      }
    }

    if (message) {
      template = template.replace(
        '<textarea type="text" id="message" name="message" rows="2" class="form-control md-textarea" placeholder="This is your email content."></textarea>',
        `<textarea type="text" id="message" name="message" rows="2" class="form-control md-textarea" placeholder="This is your email content.">${sanitizedMessage}</textarea>`
      );
    } else {
      template = template.replace(
        '<textarea type="text" id="message" name="message" rows="2" class="form-control md-textarea" placeholder="This is your email content."></textarea>',
        `<textarea type="text" id="message" name="message" rows="2" class="form-control md-textarea invalid" placeholder="This is your email content."></textarea>`
      );
    }

    template = template.replace("{{nonce}}", res.locals._csrf);

    template = template.replace("{{csrfToken}}", sanitizedCSRFToken);

    // If there are validation errors, render the contact partial with the errors
    res.send(template);
    return;
  }

  if (req.recaptcha.error) {
    template = errorSource;

    template = template.replace("{{contacterrors}}", req.recaptcha.error);

    // If there are validation errors, render the contact partial with the errors
    res.send(template);
    return;
  }

  // Send the email
  try {
    var sendStatus = await sendMail(
      fromEmail,
      toEmail,
      subject_combined,
      messaged_combined,
      res
    );

    if (sendStatus) {
      template = successSource;

      template = template.replace(
        "{{contacterrors}}",
        "Message sent! I'll get back to you as soon as I can!"
      );
    } else {
      template = errorSource;

      template = template.replace(
        "{{contacterrors}}",
        "There was an error sending your message. Please try again later."
      );
    }

    // If there are validation errors, render the contact partial with the errors
    res.send(template);
    return;
  } catch (error) {
    console.error("Error sending email:", error);
    template = errorSource;

    template = template.replace(
      "{{contacterrors}}",
      "There was an error sending your message. Please try again later."
    );

    res.send(template);
    return;
  }
});

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
