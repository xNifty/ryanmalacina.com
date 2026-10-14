/*
  Admin: projects

  GET    /admin/projects               - list, filterable with ?status=published|drafts|featured
  GET    /admin/projects/new           - editor for a new project
  POST   /admin/projects               - create
  GET    /admin/projects/:id/edit      - editor
  POST   /admin/projects/:id           - save
  PUT    /admin/projects/:id/publish   - publish (HTMX: returns the row)
  PUT    /admin/projects/:id/unpublish - unpublish (HTMX: returns the row)
  PUT    /admin/projects/:id/feature   - toggle featured on the home page (HTMX: returns the row)
  DELETE /admin/projects/:id           - delete (HTMX: removes the row)
*/
import express from "express";

import * as projects from "../../services/projects.js";
import { validateProjectForm } from "../../utils/validation.js";
import { prepareImageUpload } from "../../utils/imageUpload.js";
import logErrorToFile from "../../utils/errorLogging.js";
import { strings } from "../../config/constants.js";
import { statusTabs, renderRowAction, duplicateFieldError } from "./helpers.js";

const ROUTER = express.Router();


const TABS = [
  { key: "", label: "All" },
  { key: "published", label: "Published" },
  { key: "drafts", label: "Drafts" },
  { key: "featured", label: "Featured" },
];

const DUPLICATE_MESSAGES = {
  name: "Another project already uses this name.",
  title: "Another project already uses this title.",
  slug: "Another project already uses this slug.",
};

const ROW = "admin/project-row";

ROUTER.get("/", async (req, res) => {
  const { status, tabs } = statusTabs(TABS, req.query.status);
  res.render("admin/projects/index", {
    title: "Projects | Admin",
    section: "projects",
    projects: await projects.listAll(status),
    tabs,
    featuredLimit: projects.FEATURED_LIMIT,
  });
});

ROUTER.get("/new", (req, res) => {
  renderEditor(res, { isNew: true, values: { isPublished: false } });
});

ROUTER.post("/", async (req, res) => {
  const { value, errors } = validateProjectForm(req.body);
  const imageFile = req.files?.image;
  const upload = imageFile ? prepareImageUpload(imageFile) : null;
  const allErrors = { ...errors, ...(upload?.error && { image: upload.error }) };

  if (Object.keys(allErrors).length > 0) {
    return renderEditor(res.status(400), { isNew: true, values: req.body, errors: allErrors });
  }

  try {
    // Save first so a validation or duplicate-key failure doesn't leave an orphaned upload
    const project = await projects.create(value, upload?.fileName);
    if (upload) {
      await imageFile.mv("./public/images/" + upload.fileName);
    }
    req.flash("success", `Created “${project.name}”.`);
    return res.redirect(`/admin/projects/${project._id}/edit`);
  } catch (ex) {
    const fieldError = duplicateFieldError(ex, DUPLICATE_MESSAGES);
    if (!fieldError) logErrorToFile(ex);
    return renderEditor(res.status(fieldError ? 400 : 500), {
      isNew: true,
      values: req.body,
      errors: fieldError ?? { form: strings.errors.genericError },
    });
  }
});

ROUTER.get("/:id/edit", async (req, res) => {
  const project = await projects.findById(req.params.id);
  if (!project) return notFound(req, res);

  renderEditor(res, { project, values: project.toObject() });
});

ROUTER.post("/:id", async (req, res) => {
  const project = await projects.findById(req.params.id);
  if (!project) return notFound(req, res);

  const { value, errors } = validateProjectForm(req.body);
  const imageFile = req.files?.image;
  const upload = imageFile ? prepareImageUpload(imageFile) : null;
  const allErrors = { ...errors, ...(upload?.error && { image: upload.error }) };

  if (Object.keys(allErrors).length > 0) {
    return renderEditor(res.status(400), { project, values: req.body, errors: allErrors });
  }

  let newImage;
  if (upload) {
    try {
      await imageFile.mv("./public/images/" + upload.fileName);
      newImage = upload.fileName;
    } catch (err) {
      // Keep the existing image if the move fails
      logErrorToFile(err);
    }
  }

  try {
    await projects.update(project, value, newImage);
  } catch (ex) {
    const fieldError = duplicateFieldError(ex, DUPLICATE_MESSAGES);
    if (!fieldError) logErrorToFile(ex);
    return renderEditor(res.status(fieldError ? 400 : 500), {
      project,
      values: req.body,
      errors: fieldError ?? { form: strings.errors.genericError },
    });
  }

  req.flash("success", `Saved “${project.name}”.`);
  return res.redirect(`/admin/projects/${project._id}/edit`);
});

ROUTER.put("/:id/publish", (req, res) => publishAction(req, res, true));
ROUTER.put("/:id/unpublish", (req, res) => publishAction(req, res, false));

async function publishAction(req, res, published) {
  const row = await projects.setPublished(req.params.id, published);
  if (!row) return missingRow(res);

  return renderRowAction(res, {
    row: ROW,
    item: row,
    toast: {
      type: "success",
      message: `${published ? "Published" : "Unpublished"} “${row.name}”.`,
    },
  });
}

ROUTER.put("/:id/feature", async (req, res) => {
  const outcome = await projects.toggleFeatured(req.params.id);
  if (outcome === "notFound") return missingRow(res);

  const row = await projects.findRow(req.params.id);
  const toast =
    outcome === "limit"
      ? {
          type: "error",
          message: `Only ${projects.FEATURED_LIMIT} projects can be featured. Unfeature one first.`,
        }
      : {
          type: "success",
          message: `${outcome === "featured" ? "Featured" : "Unfeatured"} “${row.name}”.`,
        };

  return renderRowAction(res, { row: ROW, item: row, toast });
});

ROUTER.delete("/:id", async (req, res) => {
  const row = await projects.findRow(req.params.id);
  if (!row || !(await projects.remove(req.params.id))) return missingRow(res);

  // No row in the response: htmx swaps the deleted row out for nothing
  return renderRowAction(res, {
    toast: { type: "success", message: `Deleted “${row.name}”.` },
  });
});

function renderEditor(res, { isNew = false, project, values, errors }) {
  res.render("admin/projects/edit", {
    title: `${isNew ? "New project" : values.name || "Edit project"} | Admin`,
    section: "projects",
    isNew,
    project: project?.toObject?.() ?? project,
    action: isNew ? "/admin/projects" : `/admin/projects/${project._id}`,
    draftKey: isNew ? "project:new" : `project:${project._id}`,
    values,
    errors,
  });
}

function notFound(req, res) {
  req.flash("error", "That project doesn't exist. It may have been deleted.");
  return res.redirect("/admin/projects");
}

// The row was deleted elsewhere (another tab, say): drop it and say so
function missingRow(res) {
  return renderRowAction(res, {
    toast: { type: "error", message: "That project no longer exists." },
  });
}

export { ROUTER as adminProjectsRoute };
