/*
  contains all the routes for the projects page

  /projects - GET - returns all the projects
  /projects/new - GET - returns the new project page
  /projects/new - POST - creates a new project
  /projects/:id/edit - GET - returns the edit project page
  /projects/:id/edit - POST - updates a project
  /projects/:id - GET - returns a single project
  /projects/update/:id - PUT - toggles whether a project is featured on the home page
  /projects/delete/:id - PUT - deletes a project
  /projects/delete-modal/:id - GET - the delete confirmation modal
*/

import express from "express";
import dateFormat from "dateformat";
import fileUpload from "express-fileupload";

import * as projects from "../services/projects.js";
import { renderProjectPage } from "../services/markdown.js";
import { validateProject } from "../models/projects.js";
import { prepareImageUpload, MAX_IMAGE_BYTES } from "../utils/imageUpload.js";
import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import logErrorToFile from "../utils/errorLogging.js";
import ValidTarget from "../utils/validTarget.js";
import { renderAlert, renderDeleteModal } from "../utils/renderPartial.js";

const ROUTER = express.Router();

ROUTER.use(fileUpload({ limits: { fileSize: MAX_IMAGE_BYTES } }));

ROUTER.get("/", async (req, res) => {
  res.render("projects", {
    title: "Ryan Malacina | Projects",
    projects: await projects.listPublished(),
    csrfToken: res.locals._csrf,
  });
});

ROUTER.get(
  "/new",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    // The back button returns wherever you came from on this site
    const referrer = req.get("referrer");

    res.render("admin/projects/new-project", {
      layout: "admin",
      markdownEditor: true,
      new_project: true,
      return_to: referrer && ValidTarget(referrer) ? referrer : "/admin/projects",
      csrfToken: res.locals._csrf,
    });
  }
);

ROUTER.post(
  "/new",
  [auth.ValidateLoggedIn(true), auth.ValidateAdmin],
  async (req, res) => {
    const { _csrf, ...fields } = req.body;
    const { error } = validateProject(fields);

    if (error) {
      return projectFormError(req, res, projectValidationErrors(error), "/projects/new");
    }

    const imageFile = req.files?.project_image;
    const upload = imageFile ? prepareImageUpload(imageFile) : null;

    if (upload?.error) {
      return projectFormError(req, res, upload.error, "/projects/new");
    }

    try {
      // Save first so a validation or duplicate-key failure doesn't leave an orphaned upload
      const project = await projects.create(fields, upload?.fileName);

      if (upload) {
        await imageFile.mv("./public/images/" + upload.fileName);
      }

      req.flash("success", strings.success.projectAdded);
      res.setHeader("HX-Redirect", "/projects/" + project._id + "/edit");
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
    const project = await projects.findById(req.params.id);

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
    const project = await projects.findById(req.params.id);

    if (!project) {
      return renderProjectNotFound(res);
    }

    const editUrl = `/projects/${project._id}/edit`;
    const { _csrf, ...fields } = req.body;
    const { error } = validateProject(fields);

    if (error) {
      return projectFormError(req, res, projectValidationErrors(error), editUrl);
    }

    let newImage;
    const imageFile = req.files?.project_image;

    if (imageFile) {
      const upload = prepareImageUpload(imageFile);
      if (upload.error) {
        return projectFormError(req, res, upload.error, editUrl);
      }

      try {
        await imageFile.mv("./public/images/" + upload.fileName);
        newImage = upload.fileName;
      } catch (err) {
        // Keep the existing image if the move fails
        logErrorToFile(err);
      }
    }

    try {
      await projects.update(project, fields, newImage);
    } catch (ex) {
      const duplicate = duplicateKeyMessage(ex);
      if (!duplicate) logErrorToFile(ex);
      return projectFormError(req, res, duplicate ?? strings.errors.genericError, editUrl);
    }

    if (req.get("HX-Request")) {
      // update-project.js swaps the thumbnail to this URL
      res.set("HX-Trigger", JSON.stringify({ updateImage: { src: `/images/${project.project_image}` } }));
      return renderAlert(res, "success", strings.success.projectUpdated);
    }

    req.flash("success", strings.success.projectUpdated);
    return res.redirect(`/projects/${project._id}`);
  }
);

ROUTER.put(
  "/delete/:id",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    let deleted = false;
    try {
      deleted = await projects.remove(req.params.id);
    } catch (err) {
      logErrorToFile(err);
    }

    req.flash(deleted ? "success" : "error", deleted ? strings.success.deleteSuccess : strings.errors.publishError);
    res.setHeader("HX-Redirect", "/admin/projects");
    return res.status(deleted ? 200 : 500).end();
  }
);

ROUTER.get("/delete-modal/:id", [auth.ValidateLoggedIn(), auth.ValidateAdmin], (req, res) => {
  return renderDeleteModal(res, "/projects/delete/", req.params.id);
});

ROUTER.get("/:id", async (req, res) => {
  const project = await projects.findById(req.params.id);

  if (!project || !project.is_published) {
    return renderProjectNotFound(res);
  }

  res.render("projects", {
    project_title: project.project_title,
    project_source: project.project_source,
    project_description: renderProjectPage(project.project_description_markdown),
    project_name: project.project_name,
    is_valid: true,
    last_save_date: dateFormat(project.last_edited, "mmmm dd, yyyy @ h:MM TT"),
    title: "Ryan Malacina | " + project.project_name,
    id: project._id,
    csrfToken: res.locals._csrf,
  });
});

// Toggle whether a project is featured on the home page
ROUTER.put(
  "/update/:id",
  [auth.ValidateLoggedIn(), auth.ValidateAdmin],
  async (req, res) => {
    res.set("HX-Location", "/admin/projects");

    let outcome;
    try {
      outcome = await projects.toggleFeatured(req.params.id);
    } catch (err) {
      logErrorToFile(err);
      return res.status(500).end();
    }

    if (outcome === "notFound") {
      return res.status(404).end();
    }
    if (outcome === "limit") {
      req.flash("error", strings.errors.indexLimitReached);
      return res.status(400).end();
    }
    return res.status(200).end();
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

function renderProjectNotFound(res) {
  return res.status(404).render("error", {
    error: strings.errors.invalidProject,
    title: strings.pageHeader.notFound,
    status_code: strings.status[404],
  });
}

export { ROUTER as projectsRoute };
