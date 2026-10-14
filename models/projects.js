import mongoose from "mongoose";
import Joi from "joi";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true,
      maxlength: 125,
    },
    title: {
      type: String,
      unique: true,
      required: true,
      maxlength: 125,
    },
    // Set once at creation so public URLs stay stable when the name changes
    slug: {
      type: String,
      unique: true,
      required: true,
      maxlength: 100,
    },
    source: {
      type: String,
      required: true,
      maxlength: 100,
    },
    descriptionMarkdown: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 25000,
    },
    descriptionHtml: {
      type: String,
      minlength: 10,
      maxlength: 25000,
    },
    image: {
      type: String,
      maxlength: 150,
      default: "default.png",
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    // Shown on the home page; services/projects.js caps how many
    featured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Validates the admin project form (whose field names predate the schema's)
export function validateProject(form) {
  const schema = Joi.object({
    project_name: Joi.string().max(125).required(),
    project_title: Joi.string().max(125).required(),
    project_source: Joi.string().max(100).required(),
    project_description: Joi.string().min(20).max(10000).required(),
    project_image: Joi.string().max(150).allow(""),
  }).options({ abortEarly: false });

  return schema.validate(form);
}

export default {
  validateProject,
};
export const Project = mongoose.model("Project", projectSchema);
