/*
  contains all the routes for the projects page

  /projects - GET - returns all the projects
  /projects/new - GET - returns the new project page
  /projects/new - POST - creates a new project
  /projects/:id/edit - GET - returns the edit project page
  /projects/:id/edit - POST - updates a project
  /projects/:id - GET - returns a single project
  /projects/:id/update - PUT - updates the index of a project
  /projects/delete/:id - PUT - deletes a project
*/

import express from "express";
import markdownit from "markdown-it";
import sanitize from "sanitize-html";
import dateFormat from "dateformat";
import fileUpload from "express-fileupload";
import hljs from "highlight.js";
import { prepareImageUpload, MAX_IMAGE_BYTES } from "../utils/imageUpload.js";
import config from "config";
import _ from "lodash";
import mongoose from "mongoose";

import { Project, validateProject } from "../models/projects.js";
import { clearProjectSession } from "../utils/sessionHandler.js";
import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import logErrorToFile from "../utils/errorLogging.js";
import { renderAlert, renderDeleteModal } from "../utils/renderPartial.js";

// highlight.js language imports
import js from "highlight.js/lib/languages/javascript";
import go from "highlight.js/lib/languages/go";
import dos from "highlight.js/lib/languages/dos";
import ts from "highlight.js/lib/languages/typescript";
import py from "highlight.js/lib/languages/python";
import csharp from "highlight.js/lib/languages/csharp";

hljs.registerLanguage("javascript", js);
hljs.registerLanguage("go", go);
hljs.registerLanguage("dos", dos);
hljs.registerLanguage("typescript", ts);
hljs.registerLanguage("python", py);
hljs.registerLanguage("csharp", csharp);

const ROUTER = express.Router();

const MARKDOWN = markdownit({
  highlight: function(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (err) {
        // simply log error and move on
        logErrorToFile(err);
      }
    }
    return '';
  }
});

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

ROUTER.use(fileUpload({ limits: { fileSize: MAX_IMAGE_BYTES } }));

ROUTER.get("/", async (req, res) => {
  let project_list = await listProjects();

  res.render("projects", {
    title: "Ryan Malacina | Projects",
    projects: project_list,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.get(
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

    res.render("admin/projects/new-project", {
      layout: "admin",
      markdownEditor: true,
      new_project: true,
      return_to: returnTo,
      csrfToken: res.locals._csrf,
    });

    clearProjectSession(req);
  }
);

ROUTER.post(
  "/new",
  [auth.ValidateLoggedIn(true), auth.ValidateAdmin],
  async (req, res) => {
    const { _csrf, ...FormData } = req.body;
    const { error } = validateProject(FormData);

    if (error) {
      return projectFormError(req, res, projectValidationErrors(error), "/projects/new");
    }

    const imageFile = req.files?.project_image;
    const upload = imageFile ? prepareImageUpload(imageFile) : null;

    if (upload?.error) {
      return projectFormError(req, res, upload.error, "/projects/new");
    }

    const project = new Project(
      _.pick(req.body, ["project_name", "project_title", "project_source"])
    );
    project.project_description_markdown = req.body.project_description;
    project.project_description_html = renderProjectHtml(req.body.project_description);
    project.project_image = upload ? upload.fileName : "default.png";

    try {
      // Save first so a validation or duplicate-key failure doesn't leave an orphaned upload
      const result = await project.save();

      if (upload) {
        await imageFile.mv("./public/images/" + upload.fileName);
      }

      req.flash("success", strings.success.projectAdded);
      res.setHeader("HX-Redirect", "/projects/" + result._id + "/edit");
      return res.status(200).end();
    } catch (ex) {
      const duplicate = duplicateKeyMessage(ex);
      if (!duplicate) logErrorToFile(ex);
      return projectFormError(req, res, duplicate ?? strings.errors.genericError, "/projects/new");
    }
  }
);

ROUTER.get(
  "/:id/edit",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    const project = await findProjectById(req.params.id);

    if (!project) {
      return renderProjectNotFound(res);
    }

    res.render("admin/projects/update-project", {
      layout: "admin",
      markdownEditor: true,
      pageScripts: ["update-project.js"],
      update_project: true,
      project_name: project.project_name,
      project_title: project.project_title,
      project_source: project.project_source,
      project_description: project.project_description_markdown,
      project_image: project.project_image,
      id: project._id,
      csrfToken: res.locals._csrf,
    });
  }
);

ROUTER.post(
  "/:id/edit",
  [auth.ValidateLoggedIn(true), auth.ValidateAdmin],
  async (req, res) => {
    const projectUpdate = await findProjectById(req.params.id);

    if (!projectUpdate) {
      return renderProjectNotFound(res);
    }

    const editUrl = `/projects/${projectUpdate._id}/edit`;
    const { _csrf, ...FormData } = req.body;
    const { error } = validateProject(FormData);

    if (error) {
      return projectFormError(req, res, projectValidationErrors(error), editUrl);
    }

    let projectImage = projectUpdate.project_image;
    const imageFile = req.files?.project_image;

    if (imageFile) {
      const upload = prepareImageUpload(imageFile);
      if (upload.error) {
        return projectFormError(req, res, upload.error, editUrl);
      }

      try {
        await imageFile.mv("./public/images/" + upload.fileName);
        projectImage = upload.fileName;
      } catch (err) {
        // Keep the existing image if the move fails
        logErrorToFile(err);
      }
    }

    projectUpdate.project_name = req.body.project_name;
    projectUpdate.project_title = req.body.project_title;
    projectUpdate.project_source = req.body.project_source;
    projectUpdate.project_description_markdown = req.body.project_description;
    projectUpdate.project_description_html = renderProjectHtml(req.body.project_description);
    projectUpdate.project_image = projectImage;
    projectUpdate.last_edited = new Date();

    try {
      await projectUpdate.save();
    } catch (ex) {
      const duplicate = duplicateKeyMessage(ex);
      if (!duplicate) logErrorToFile(ex);
      return projectFormError(req, res, duplicate ?? strings.errors.genericError, editUrl);
    }

    if (req.get("HX-Request")) {
      // update-project.js swaps the thumbnail to this URL
      res.set("HX-Trigger", JSON.stringify({ updateImage: { src: `/images/${projectImage}` } }));
      return renderAlert(res, "success", strings.success.projectUpdated);
    }

    req.flash("success", strings.success.projectUpdated);
    return res.redirect(`/projects/${projectUpdate._id}`);
  }
);

// Delete project
ROUTER.put(
  "/delete/:id",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let id = req.params.id;
    if (await deleteProject(id)) {
      //console.log("Project Deleted");
      req.flash("success", strings.success.deleteSuccess);
      res.setHeader("HX-Redirect", "/admin/projects");
      res.status(200).end(); // or res.sendStatus(200)
    } else {
      req.flash("error", strings.errors.publishError);
      res.setHeader("HX-Redirect", "/admin/projects");
      res.status(500).end(); // or res.sendStatus(200)
    }
  }
);

ROUTER.get("/delete-modal/:id", [auth.ValidateLoggedIn(), auth.ValidateAdmin], (req, res) => {
  return renderDeleteModal(res, "/projects/delete/", req.params.id);
});

ROUTER.get("/:id", async (req, res) => {
  const project = await findProjectById(req.params.id);

  // Intentionally leaving this different, as our "custom" error page doesn't display the text via alerts
  if (!project || !project.is_published) {
    return renderProjectNotFound(res);
  }

  req.session.projectReturnTo =
    config.get("rootURL") + "/projects/" + project._id;

  let project_html = MARKDOWN.render(project.project_description_markdown);
  //project_html = project_html.replace(
  //  /<img src="https:\/\/github\.com\/user-attachment/g,
  //  '<img src="/proxy-image?url=https://github.com/user-attachment'
  //);

  res.render("projects", {
    project_title: project.project_title,
    project_source: project.project_source,
    project_description: project_html,
    project_name: project.project_name,
    is_valid: true,
    last_save_date: dateFormat(project.last_edited, "mmmm dd, yyyy @ h:MM TT"),
    title: "Ryan Malacina | " + project.project_name,
    id: project._id,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.put(
  "/update/:id",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let id = req.params.id;
    res.setHeader("content-type", "text/plain");
    const project = await findProjectById(id);

    if (!project) {
      res.set("HX-Location", "/admin/projects");
      return res.status(404).end();
    }

    let status = project.show_index;
    const totalIndex = await Project.countDocuments({ show_index: true });

    if (!status && totalIndex === 3) {
      req.flash("error", strings.errors.indexLimitReached);
      res.set("HX-Location", "/admin/projects");
      return res.status(400).end();
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
      res.set("HX-Location", "/admin/projects");
      return res.status(200).end();
    } catch (err) {
      res.set("HX-Location", "/admin/projects");
      return res.status(500).end();
    }
  }
);

// Validation message per form field, in the order they are reported
const PROJECT_FIELD_ERRORS = {
  project_description: strings.errors.projectDescriptionLength,
  project_name: strings.errors.projectName,
  project_title: strings.errors.projectTitle,
  project_source: strings.errors.projectSource,
};

/**
 * @param {Object} error - A Joi validation error
 * @returns {string[]} - One message per failing field
 */
function projectValidationErrors(error) {
  const failed = new Set(error.details.map((detail) => detail.context.key));
  const messages = Object.keys(PROJECT_FIELD_ERRORS)
    .filter((key) => failed.has(key))
    .map((key) => PROJECT_FIELD_ERRORS[key]);
  return messages.length > 0 ? messages : [strings.errors.allFieldsRequired];
}

/**
 * @param {Error} ex - An error from saving a project
 * @returns {string|null} - The message for a unique-index violation, or null for anything else
 */
function duplicateKeyMessage(ex) {
  if (ex.code !== 11000) return null;
  const index = ex.message.match(/index: (\w+)/)?.[1];
  if (index === "project_name_1") return strings.errors.projectNameUnique;
  if (index === "project_title_1") return strings.errors.projectTitleUnique;
  return strings.errors.genericError;
}

/**
 * Show form errors: an alert for HTMX requests, otherwise a flash message and a redirect
 */
function projectFormError(req, res, messages, redirectTo) {
  if (req.get("HX-Request")) {
    return renderAlert(res, "danger", messages);
  }
  // status.handlebars renders flash errors unescaped; these messages are all constants
  req.flash("error", [].concat(messages).join("<br>"));
  return res.redirect(redirectTo);
}

function renderProjectHtml(markdown) {
  return sanitize(MARKDOWN.render(markdown), { allowedTags: safeTags });
}

/**
 * Find a project by id, treating malformed ids as not found
 * @param {string} id - The id of the project
 * @returns {Promise} - A promise that resolves to the project or null
 */
async function findProjectById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Project.findOne({ _id: { $eq: id } });
}

function renderProjectNotFound(res) {
  return res.status(404).render("error", {
    error: strings.errors.invalidProject,
    title: strings.pageHeader.notFound,
    status_code: strings.status[404],
  });
}

/**
 * List all published projects
 * @returns {Promise} - A promise that resolves to an array of projects
 */
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

/**
  * Delete a project
  * @param {string} id - The id of the project to delete
  * @returns {boolean} - Whether the project was deleted
  */
async function deleteProject(id) {
  try {
    await Project.deleteOne({ _id: id });
    return true;
  } catch (err) {
    logErrorToFile(err);
    return false;
  }
}

export { ROUTER as projectsRoute };
