/*
  Contains all the admin routes for the site

  /projects - List all projects
  /projects/publish/:id - Publish a project
  /projects/unpublish/:id - Unpublish a project
  /news - List all news
  /news/new - Add a new news entry
  /news/publish/:id - Publish a news entry
  /news/unpublish/:id - Unpublish a news entry
  /news/delete/:id - Delete a news entry
  /news/:id/edit - Edit a news entry
  /news/edit - Save the edited news entry
  /news/delete-modal/:id - Get the delete modal for a news entry

  publishProject - Publish a project
  unpublishProject - Unpublish a project
  publishNews - Publish a news entry
  unpublishNews - Unpublish a news entry
  deleteNews - Delete a news entry
  listProjects - List all projects
  getNewsListing - List all news entries

*/

import express from "express";
import sanitize from "sanitize-html";
import dateFormat from "dateformat";
import MarkdownIt from "markdown-it";
import _ from "lodash";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

import auth from "../utils/auth.js";
import logErrorToFile from "../utils/errorLogging.js";
import deleteModal from "../utils/delete-modal.js";
import client from "../utils/elastic.js";

import { Project } from "../models/projects.js";
import { News, validateNews } from "../models/news.js";
import { strings } from "../config/constants.js";

const ROUTER = express.Router();

//let converter = new showdown.Converter();
let md = new MarkdownIt();

ROUTER.get(
  "/",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    res.render("admin", {
      layout: "admin",
      title: strings.pageHeader.admin,
      csrfToken: res.locals._csrf,
    });
  }
);

ROUTER.get(
  "/projects",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let project_list = await listProjects();

    project_list.forEach((project) => {
      project.csrfToken = res.locals._csrf;
    });

    res.render("admin/projects/projects", {
      layout: "admin",
      title: strings.pageHeader.adminProject,
      projects: project_list,
      csrfToken: res.locals._csrf,
    });
  }
);

ROUTER.put(
  "/projects/publish/:id",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let id = req.params.id;
    if (await publishProject(id)) {
      req.flash("success", strings.success.projectPublished);
      res.set("HX-Location", "/admin/projects");
      return res.status(200).end();
    } else {
      req.flash("error", strings.errors.publishError);
      res.set("HX-Location", "/admin/projects");
      return res.status(500).end();
    }
  }
);

ROUTER.put(
  "/projects/unpublish/:id",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let id = req.params.id;
    if (await unpublishProject(id)) {
      req.flash("success", strings.success.projectUnpublished);
      res.set("HX-Location", "/admin/projects");
      return res.status(200).end();
    } else {
      req.flash("error", strings.errors.publishError);
      res.set("HX-Location", "/admin/projects");
      res.status(400).end();
    }
  }
);

ROUTER.get(
  "/news",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let news_list = await getNewsListing();

    news_list.forEach((news) => {
      news.csrfToken = res.locals._csrf;
    });

    res.render("admin/news/news", {
      layout: "news",
      title: strings.pageHeader.adminProject,
      news: news_list,
      csrfToken: res.locals._csrf,
    });
  }
);

// Publish the news entry
ROUTER.post(
  "/news/new",
  [auth.ValidateLoggedIn(true), auth.ValidateAdmin],
  async (req, res) => {
    const { _csrf, ...FormData } = req.body;

    const { error } = validateNews(FormData);

    let news_list = await getNewsListing();

    let news = new News(_.pick(req.body, ["news_title"]));

    if (error) {
      var errorMessage;

      for (let i = 0; i < error.details.length; i++) {
        if (error.details[i].context.key === "news_description") {
          errorMessage = strings.errors.newsDescriptionLength;
        } else {
          errorMessage = strings.errors.allFieldsRequired;
        }
      }

      return res.status(400).render("admin/news/news", {
        error: errorMessage,
        layout: "news",
        news_title: req.body.news_title,
        news_description: req.body.news_description,
        loadJS: true,
        news: news_list,
      });
    }
    let newsDescription = md.render(req.body.news_description);

    let newsSanitized = sanitize(newsDescription, {
      allowedTags: sanitize.defaults.allowedTags.concat(["h1"]),
    });
    let newsCleaned = sanitize(newsDescription, { allowedTags: [] });

    news.news_description_markdown = req.body.news_description;
    news.news_description_html = newsSanitized;
    news.news_clean_output = newsCleaned;
    let saveDate = new Date(Date.now());

    news.published_date = dateFormat(saveDate, "mmmm dd, yyyy @ h:MM TT");
    news.published_date_unclean = saveDate;

    try {
      await news.save();
    } catch (ex) {
      return res.status(400).render("admin/news/news", {
        error: strings.errors.allFieldsRequired,
        layout: "news",
        news_title: req.body.news_title,
        news_description: req.body.news_description,
        loadJS: true,
        news: news_list,
      });
    }
    req.flash("success", strings.success.newsAdded);
    res.redirect("/admin/news");
  }
);

ROUTER.put(
  "/news/publish/:id",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let id = req.params.id;
    if (await publishNews(id)) {
      req.flash("success", strings.success.newsPublished);
      res.set("HX-Location", "/admin/news");
      return res.status(200).end();
    } else {
      req.flash("error", strings.errors.publishError);
      res.set("HX-Location", "/admin/news");
      res.status(400).end();
    }
  }
);

ROUTER.put(
  "/news/unpublish/:id",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let id = req.params.id;
    if (await unpublishNews(id)) {
      req.flash("success", strings.success.newsUnpublished);
      res.set("HX-Location", "/admin/news");
      return res.status(200).end();
    } else {
      req.flash("error", strings.errors.publishError);
      res.set("HX-Location", "/admin/news");
      res.status(400).end();
    }
  }
);

ROUTER.put(
  "/news/delete/:id",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let id = req.params.id;
    if (await deleteNews(id)) {
      req.flash("success", strings.success.deleteSuccess);
      res.setHeader("HX-Redirect", "/admin/news");
      res.status(200).end(); // or res.sendStatus(200)
    } else {
      req.flash("error", strings.errors.publishError);
      res.setHeader("HX-Redirect", "/admin/news");
      res.status(500).end(); // or res.sendStatus(200)
    }
  }
);

// Edit News
ROUTER.get(
  "/news/:id/edit",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let id = req.params.id;

    if (id == undefined) {
      id = req.session.news_id;
      req.session.news_id = null;
    }

    let news = null;

    try {
      news = await News.findOne({
        _id: { $eq: id },
      });
    } catch (err) {
      logErrorToFile(err);
      let news_list = await getNewsListing();
      req.session.news_id = null;

      res.render("admin/news/admin-news", {
        title: strings.pageHeader.adminProject,
        news: news_list,
        csrfToken: res.locals._csrf,
      });
    }

    req.session.news_id = news._id;

    // Render edit news section - if no valid ID is found, send back to the news index and reset session var to be safe
    if (id != undefined) {
      res.render("admin/news/edit", {
        layout: "news",
        title: news.news_title,
        news_title: news.news_title,
        news_description: news.news_description_markdown,
        loadJS: true,
        csrfToken: res.locals._csrf,
      });
    } else {
      let news_list = await getNewsListing();
      req.session.news_id = null;

      res.render("admin/news/news", {
        layout: "admin",
        title: strings.pageHeader.adminProject,
        news: news_list,
        loadJS: true,
        csrfToken: res.locals._csrf,
      });
    }
  }
);

// Publish the news entry
ROUTER.post(
  "/news/edit",
  [auth.ValidateLoggedIn(true), auth.ValidateAdmin],
  async (req, res) => {
    const { _csrf, ...FormData } = req.body;
    const { error } = validateNews(FormData);

    let news = new News(_.pick(req.body, ["news_title"]));

    if (error) {
      return res.status(400).render("admin/news/edit", {
        layout: "news",
        error: strings.errors.allFieldsRequired,
        title: req.body.news_title,
        news_title: req.body.news_title,
        news_description: req.body.news_description,
      });
    }
    let newsDescription = md.render(req.body.news_description);
    let newsSanitized = sanitize(newsDescription, {
      allowedTags: sanitize.defaults.allowedTags.concat(["h1"]),
    });
    let newsCleaned = sanitize(newsDescription, { allowedTags: [] });

    news.news_description_markdown = req.body.news_description;
    news.news_description_html = newsSanitized;
    news.news_clean_output = newsCleaned;
    let saveDate = new Date(Date.now());

    news.published_date = dateFormat(saveDate, "mmmm dd, yyyy @ h:MM TT");
    news.published_date_unclean = saveDate;

    try {
      let news_id = req.session.news_id;

      if (typeof news_id !== "string") {
        res.status(400).json({ status: "error" });
        return;
      }

      await News.findByIdAndUpdate(news_id, {
        news_title: req.body.news_title,
        news_description_markdown: req.body.news_description,
        news_description_html: newsSanitized,
        news_clean_output: newsCleaned,
      });

      await client.index({
        index: 'news',
        id: news_id,
        body: {
          news_title: req.body.news_title,
          news_description_html: newsSanitized,
        }
      });
    } catch (ex) {
      console.log("Error in news edit: ", ex.message);
      return res.status(400).render("admin/news/edit", {
        layout: "news",
        error: strings.errors.allFieldsRequired,
        title: req.body.news_title,
        news_title: req.body.news_title,
        news_description: req.body.news_description,
      });
    }
    req.session.news_id = null;
    req.flash("success", strings.success.newsEdited);
    res.redirect("/admin/news");
  }
);

ROUTER.get("/news/delete-modal/:id", (req, res) => {
  const window = new JSDOM("").window;
  const DOMPurify = createDOMPurify(window);

  let sanitizedID = DOMPurify.sanitize(req.params.id);
  let sanitizedCSRFToken = DOMPurify.sanitize(res.locals._csrf);
  let modal = deleteModal(
    sanitizedID,
    sanitizedCSRFToken,
    "/admin/news/delete/"
  );
  res.send(modal);
});

async function publishProject(id) {
  try {
    await Project.findByIdAndUpdate(
      { _id: id },
      {
        is_published: true,
      }
    );
    return true;
  } catch (err) {
    logErrorToFile(err);
    return false;
  }
}

async function unpublishProject(id) {
  try {
    await Project.findByIdAndUpdate(
      { _id: id },
      {
        is_published: false,
      }
    );
    return true;
  } catch (err) {
    logErrorToFile(err);
    return false;
  }
}

async function publishNews(id) {
  try {
    let saveDate = new Date(Date.now());
    await News.findByIdAndUpdate(
      { _id: id },
      {
        is_published: true,
        published_date_unclean: saveDate,
      }
    );
    return true;
  } catch (err) {
    logErrorToFile(err);
    return false;
  }
}

async function unpublishNews(id) {
  try {
    await News.findByIdAndUpdate(
      { _id: id },
      {
        is_published: false,
      }
    );
    return true;
  } catch (err) {
    logErrorToFile(err);
    return false;
  }
}

async function deleteNews(id) {
  try {
    await News.deleteOne({ _id: id });
    await client.delete({ index: 'news', id: id.toString() });
    return true;
  } catch (err) {
    logErrorToFile(err);
    return false;
  }
}

async function listProjects() {
  return Project.find()
    .select({
      project_name: 1,
      project_image: 1,
      project_title: 1,
      is_published: 1,
      show_index: 1,
      _id: 1,
    })
    .lean();
}

async function getNewsListing() {
  return News.find()
    .select({
      news_title: 1,
      is_published: 1,
      _id: 1,
    })
    .lean();
}

export { ROUTER as adminRoute };
