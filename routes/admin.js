import express from "express";
import sanitize from "sanitize-html";
import dateFormat from "dateformat";
import MarkdownIt from "markdown-it";
import _ from "lodash";

import auth from "../utils/auth.js";
import logErrorToFile from "../utils/errorLogging.js";

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
      return res.end('{"success" : "Updated Successfully", "status" : 200}');
    } else {
      req.flash("error", strings.errors.publishError);
      return res.end('{"success" : "Server error", "status" : 500}');
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
      return res.end('{"success" : "Updated Successfully", "status" : 200}');
    } else {
      req.flash("error", strings.errors.publishError);
      return res.end('{"fail" : "Server error", "status" : 500}');
    }
  }
);

ROUTER.get(
  "/news",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let news_list = await getNewsListing();

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
      //console.log("Error 3: ", error);

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
    // let newsDescription = converter.makeHtml(req.body.news_description);
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
      // console.log('Error 2: ', ex);
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
      return res.end('{"success" : "Updated Successfully", "status" : 200}');
    } else {
      req.flash("error", strings.errors.publishError);
      return res.end('{"success" : "Server error", "status" : 500}');
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
      return res.end('{"success" : "Updated Successfully", "status" : 200}');
    } else {
      req.flash("error", strings.errors.publishError);
      return res.end('{"fail" : "Server error", "status" : 500}');
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
      return res.end('{"success" : "News Entry Deleted", "status" : 200}');
    } else {
      req.flash("error", strings.errors.publishError);
      return res.end('{"fail" : "Server error", "status" : 500}');
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
      // console.log("Error 3: ", error);
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

    news.published_date = dateformat(saveDate, "mmmm dd, yyyy @ h:MM TT");
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
    } catch (ex) {
      // console.log("Error 2: ", ex);
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
