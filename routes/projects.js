import express from "express";
import markdownit from "markdown-it";
import sanitize from "sanitize-html";
import dateFormat from "dateformat";
import fileUpload from "express-fileupload";
import hljs from "highlight.js";
import util from "util";
import config from "config";
import _ from "lodash";

import { Project, validateProject } from "../models/projects.js";
import {
  clearProjectEditSession,
  clearProjectSession,
} from "../utils/sessionHandler.js";
import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import logErrorToFile from "../utils/errorLogging.js";

const router = express.Router();
// Actual default values
const md = markdownit({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }

    return ""; // use external default escaping
  },
});

const dateformat = dateFormat;

const safeTags = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "p",
  "a",
  "ul",
  "ol",
  "nl",
  "li",
  "b",
  "i",
  "strong",
  "em",
  "strike",
  "code",
  "hr",
  "br",
  "table",
  "thead",
  "caption",
  "tbody",
  "tr",
  "th",
  "td",
  "pre",
];

//let converter = new showdown.Converter();

router.use(fileUpload());

router.get("/", async (req, res) => {
  let project_list = await listProjects();

  res.render("projects", {
    title: "Ryan Malacina | Projects",
    projects: project_list,
  });
});

// @TODO: Fix return updating when errors on page
router.get(
  "/new",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    var returnTo;

    if (req.session.returnToSession) {
      if (
        req.session.returnToSession === req.get("referrer") &&
        req.get("referrer") !== config.get("rootURL") + "/projects"
      )
        returnTo = req.session.returnToSession;
      else {
        returnTo = req.get("referrer");
        req.session.returnToSession = req.get("referrer");
      }
    } else {
      returnTo = req.get("referrer");
      req.session.returnToSession = req.get("referrer");
    }

    if (!req.session.loadProjectFromSession) {
      res.render("admin/projects/new-project", {
        layout: "new-project",
        new_project: true,
        return_to: returnTo,
        csrfToken: res.locals._csrf,
      });
    } else {
      res.render("admin/projects/new-project", {
        layout: "new-project",
        new_project: true,
        project_name: req.session.project_name,
        project_title: req.session.project_title,
        project_source: req.session.project_source,
        project_description: req.session.project_description_markdown,
        csrfToken: res.locals._csrf,
      });

      clearProjectSession(req);
      clearProjectEditSession(req);
    }
  }
);

router.post(
  "/new",
  [auth.ValidateLoggedIn(true), auth.ValidateAdmin],
  async (req, res) => {
    const { _csrf, ...FormData } = req.body;

    try {
      const { error } = validateProject(FormData);
      var errorMessage = "";

      if (error) {
        // Handle validation error
        for (let i = 0; i < error.details.length; i++) {
          if (error.details[i].context.key === "project_description") {
            errorMessage += strings.errors.projectDescriptionLength + "<br>";
          }
          if (error.details[i].context.key === "project_name") {
            errorMessage += strings.errors.projectName + "<br>";
          }
          if (error.details[i].context.key === "project_title") {
            errorMessage += strings.errors.projectTitle + "<br>";
          }
          if (error.details[i].context.key === "project_source") {
            errorMessage += strings.errors.projectSource + "<br>";
          }
        }
        throw new Error(errorMessage);
      }

      let project = new Project(
        _.pick(req.body, ["project_name", "project_title", "project_source"])
      );

      let projectDescription = md.render(req.body.project_description);
      let projectSanitized = sanitize(projectDescription, {
        allowedTags: safeTags,
      });

      /*
          Default the project image to blank and if it exists, we can then set the image to the image from the
          body of the page.  If there is no image found, we will use the default image that we set.
      */
      let projectImage = "";
      let adjustedFileName = "";

      if (req.files) {
        projectImage = req.files.project_image;
        adjustedFileName = projectImage.name
          .split(".")
          .join("-" + Date.now() + ".");
        project.project_image = adjustedFileName;
      } else {
        if (!project.project_image) {
          project.project_image = "default.png";
        }
      }

      project.project_description_markdown = req.body.project_description;
      project.project_description_html = projectSanitized;

      if (projectImage) {
        await projectImage.mv("./public/images/" + adjustedFileName);
      }
      await project.save();

      clearProjectEditSession(req);

      req.flash("success", strings.success.projectAdded);
      res.status(200).json({
        status: 200,
        message: strings.success.projectAdded,
      });
    } catch (ex) {
      req.session.loadProjectFromSession = true;
      req.session.project_name = req.body.project_name;
      req.session.project_title = req.body.project_title;
      req.session.project_source = req.body.project_source;
      req.session.project_description_markdown = req.body.project_description;

      if (ex.code === 11000) {
        const indexNameMatch = ex.message.match(/index: (\w+)/);
        const indexName = indexNameMatch ? indexNameMatch[1] : null;

        if (indexName === "project_name_1") {
          errorMessage += strings.errors.projectNameUnique;
        } else if (indexName === "project_title_1") {
          errorMessage += strings.errors.projectTitleUnique;
        } else {
          errorMessage += strings.errors.genericError;
        }
      } else if (errorMessage === "") {
        logErrorToFile(ex);
      }

      let saveDate = new Date(Date.now());

      req.flash(
        "error",
        errorMessage ? errorMessage : strings.errors.allFieldsRequired
      );
      return res.status(400).render("admin/projects/new-project", {
        layout: "new-project",
        new_project: true,
        error: errorMessage ? errorMessage : strings.errors.allFieldsRequired,
        project_name: req.body.project_name,
        project_title: req.body.project_title,
        project_source: req.body.project_source,
        project_description: req.body.project_description,
        project_image: req.files ? req.files.project_image : "",
        last_edited: saveDate,
      });
    }
  }
);

router.get(
  "/:id/edit",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    const project = await Project.findOne({
      _id: { $eq: req.params.id },
    });

    delete req.session.project_id;
    req.session.project_id = project._id;

    // For if the edit fails, otherwise we want to return to the normal project information page
    // Instead of this, hard set the URL from configfile (set a base url) and from there we can load the
    // proper project since we know the ID
    req.session.projectEditReturnTo =
      config.get("rootURL") + "/projects/" + project._id + "/edit";
    req.session.projectEditSuccess =
      config.get("rootURL") + "/projects/" + project._id;

    // If not load from session, then load normally; else, load from session
    if (!req.session.loadProjectFromSession) {
      res.render("admin/projects/update-project", {
        layout: "update-project",
        update_project: true,
        project_name: project.project_name,
        project_title: project.project_title,
        project_source: project.project_source,
        project_description: project.project_description_markdown,
        project_image: project.project_image,
        id: project._id,
        csrfToken: res.locals._csrf,
      });
    } else {
      res.render("admin/projects/update-project", {
        layout: "update-project",
        update_project: true,
        project_name: req.session.project_name,
        project_title: req.session.project_title,
        project_source: req.session.project_source,
        project_description: req.session.project_description_markdown,
        project_image: req.session.project_image,
        id: req.session.project_id,
        csrfToken: res.locals._csrf,
      });

      // Finally, clear up the session variables
      clearProjectEditSession(req);
    }
  }
);

router.post(
  "/:id/edit",
  [auth.ValidateLoggedIn(true), auth.ValidateAdmin],
  async (req, res) => {
    let project = await Project.find({ _id: { $eq: req.params.id } }).select({
      project_image: 1,
      _id: 0,
      is_published: 1,
    });

    req.session.project_image = project[0].project_image;

    const { _csrf, ...FormData } = req.body;

    try {
      const { error } = validateProject(FormData);
      var errorMessage = "";

      if (error) {
        // Handle validation error
        for (let i = 0; i < error.details.length; i++) {
          if (error.details[i].context.key === "project_description") {
            errorMessage += strings.errors.projectDescriptionLength + "<br>";
          }
          if (error.details[i].context.key === "project_name") {
            errorMessage += strings.errors.projectName + "<br>";
          }
          if (error.details[i].context.key === "project_title") {
            errorMessage += strings.errors.projectTitle + "<br>";
          }
          if (error.details[i].context.key === "project_source") {
            errorMessage += strings.errors.projectSource + "<br>";
          }
        }
        throw new Error(errorMessage);
      }

      let projectDescription = md.render(req.body.project_description);
      let projectSanitized = sanitize(projectDescription, {
        allowedTags: safeTags,
      });

      let saveDate = new Date(Date.now());
      let projectImage = req.session.project_image;
      let adjustedFileName = "";

      if (req.files && req.files.project_image) {
        projectImage = req.files.project_image;
        adjustedFileName = projectImage.name
          .split(".")
          .join("-" + Date.now() + ".");

        req.session.project_image = projectImage;

        const moveFilePromise = util.promisify(projectImage.mv);

        try {
          await moveFilePromise("./public/images/" + adjustedFileName);
          projectImage = adjustedFileName;
        } catch (error) {
          logErrorToFile(error);
        }
      }

      let projectUpdate = await Project.findById(req.params.id);
      projectUpdate.project_name = req.body.project_name;
      projectUpdate.project_title = req.body.project_title;
      projectUpdate.project_source = req.body.project_source;
      projectUpdate.project_description_markdown = req.body.project_description;
      projectUpdate.project_description_html = projectSanitized;
      projectUpdate.project_image = projectImage;
      projectUpdate.last_edited = saveDate;

      await projectUpdate.save();
      clearProjectEditSession(req);
      req.flash("success", strings.success.projectUpdated);
      res.status(200).json({
        status: 200,
        message: strings.success.projectUpdated,
      });
    } catch (ex) {
      if (ex.code === 11000) {
        const indexNameMatch = ex.message.match(/index: (\w+)/);
        const indexName = indexNameMatch ? indexNameMatch[1] : null;

        if (indexName === "project_name_1") {
          errorMessage = strings.errors.projectNameUnique;
        } else if (indexName === "project_title_1") {
          errorMessage = strings.errors.projectTitleUnique;
        } else {
          errorMessage = strings.errors.genericError;
        }
      } else {
        errorMessage = strings.errors.genericError;
        logErrorToFile(ex);
      }

      req.session.loadProjectFromSession = true;
      req.session.project_name = req.body.project_name;
      req.session.project_title = req.body.project_title;
      req.session.project_source = req.body.project_source;
      req.session.project_description_markdown = req.body.project_description;

      req.flash("error", errorMessage);
      return res.status(400).render("admin/projects/update-project", {
        layout: "update-project",
        update_project: true,
        project_name: req.session.project_name,
        project_title: req.session.project_title,
        project_source: req.session.project_source,
        project_description: req.session.project_description_markdown,
        project_image: project[0].project_image,
        csrfToken: res.locals._csrf,
      });
    }
  }
);

// Delete project
router.put(
  "/delete/:id",
  [auth.ValidateAdmin, auth.ValidateLoggedIn],
  async (req, res) => {
    let id = req.params.id;
    if (await deleteProject(id)) {
      req.flash("success", strings.success.deleteSuccess);
      return res.end('{"success" : "Project Deleted", "status" : 200}');
    } else {
      req.flash("error", strings.errors.publishError);
      return res.end('{"fail" : "Server error", "status" : 500}');
    }
  }
);

router.get("/:id", async (req, res) => {
  const project = await Project.findOne({
    _id: { $eq: req.params.id },
  });

  req.session.projectReturnTo =
    config.get("rootURL") + "/projects/" + project._id;

  // Intentionally leaving this different, as our "custom" error page doesn't display the text via alerts
  if (!project || !project.is_published) {
    return res.render("error", {
      error: strings.errors.invalidProject,
      title: strings.pageHeader.notFound,
      status_code: strings.status[404],
    });
  }

  res.render("projects", {
    project_title: project.project_title,
    project_source: project.project_source,
    project_description: md.render(project.project_description_markdown),
    project_name: project.project_name,
    is_valid: true,
    last_save_date: dateformat(project.last_edited, "mmmm dd, yyyy @ h:MM TT"),
    title: "Ryan Malacina | " + project.project_name,
    id: project._id,
  });
});

router.put(
  "/update/:id",
  [auth.ValidateAdmin, auth.ValidateLoggedIn],
  async (req, res) => {
    let id = req.params.id;
    res.setHeader("content-type", "text/plain");
    const project = await Project.findOne({
      _id: id,
    });

    let status = project.show_index;
    const totalIndex = await Project.countDocuments({ show_index: true })
      .count()
      .exec();

    if (!status && totalIndex === 3) {
      req.flash("error", strings.errors.indexLimitReached);
      return res.end('{"fail" : "Too Many Index Projects", "status" : 500}');
    }

    try {
      if (status) {
        await Project.findByIdAndUpdate(
          { _id: id },
          {
            show_index: false,
          }
        );
      } else {
        await Project.findByIdAndUpdate(
          { _id: id },
          {
            show_index: true,
          }
        );
      }
      return res.end('{"success" : "Index rating updated", "status" : 200}');
    } catch (err) {
      return res.end('{"fail" : "Server error", "status" : 500}');
    }
  }
);

async function listProjects() {
  return Project.find({ is_published: 1 })
    .select({
      project_name: 1,
      project_image: 1,
      project_title: 1,
      _id: 1,
    })
    .lean();
}

async function deleteProject(id) {
  try {
    await Project.deleteOne({ _id: id });
    return true;
  } catch (err) {
    logErrorToFile(err);
    return false;
  }
}

export { router as projectsRoute };
