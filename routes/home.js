import express from "express";
import { Project } from "../models/projects.js";
import { News } from "../models/news.js";
import config from "config";
import { RecaptchaV3 as Recaptcha } from "express-recaptcha";
import ghostAPI from "@tryghost/content-api";
import dateFormat from "dateformat";
import words from "number-to-words-en";
import { sendMailAndRespond } from "../utils/sendMail.js";

const router = express.Router();

const recaptcha = new Recaptcha(
  config.get("recaptchaSiteKey"),
  process.env.secretKey,
  {
    callback: "cb",
  }
);

router.get("/", recaptcha.middleware.render, async (req, res) => {
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
      for (var count in posts) {
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
    } catch {
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

  // I really dislike this, but to get our nonce in there, this is what we have to do...
  let recaptcha = res.recaptcha;

  return res.render("index", {
    title: "Ryan Malacina | Home",
    projects: project_list,
    captcha: recaptcha,
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

router.post("/send", recaptcha.middleware.verify, async (req, res) => {
  let fromEmail = req.body.email;
  let toEmail = process.env.mailgunToEmail;
  let subject = req.body.subject;
  let message = req.body.message;

  let subject_name = req.body.name;
  let subject_combined =
    `Email received on behalf of ${subject_name}:\n ` + subject;
  let messaged_combined =
    `Contact form email on behalf of: ${subject_name}\n\n----\n\n` + message;

  if (!req.recaptcha.error) {
    await sendMailAndRespond(
      fromEmail,
      toEmail,
      subject_combined,
      messaged_combined,
      res
    );
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
  const ghost = new ghostAPI({
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

export { router as homeRoute };
