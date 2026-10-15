import mongoose from "mongoose";

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
    // The public URL: /projects/<slug>. Generated from the name unless set in the editor
    slug: {
      type: String,
      unique: true,
      required: true,
      maxlength: 100,
    },
    // Earlier slugs, so links made before a rename still redirect
    previousSlugs: {
      type: [String],
      default: [],
      index: true,
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
    // Rendered from descriptionMarkdown, so its size is bounded by that limit; capping it too
    // rejected long descriptions, since the HTML is always longer than the markdown
    descriptionHtml: {
      type: String,
    },
    image: {
      type: String,
      maxlength: 150,
      default: "default.png",
    },
    // Short labels shown on project cards, e.g. ["node", "discord"]
    tags: {
      type: [String],
      default: [],
    },
    // Shown as a badge on cards; empty shows none
    status: {
      type: String,
      enum: ["", "active", "maintained", "paused", "archived"],
      default: "",
    },
    // Years worked on, e.g. 2019 to 2022, or 2019 alone for "2019–present"
    startYear: {
      type: Number,
      min: 1990,
      max: 2100,
    },
    endYear: {
      type: Number,
      min: 1990,
      max: 2100,
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

export const Project = mongoose.model("Project", projectSchema);
