import mongoose from "mongoose";

// The standalone pages edited at /admin/pages (about, now, uses). _id is the page's key; see
// services/pages.js for the list and each page's starting content.
const timelineEntrySchema = new mongoose.Schema(
  {
    when: { type: String, maxlength: 40 },
    what: { type: String, maxlength: 120 },
    detail: { type: String, maxlength: 300 },
  },
  { _id: false }
);

const pageSchema = new mongoose.Schema(
  {
    _id: { type: String },
    title: { type: String, required: true, maxlength: 125 },
    // One line under the heading; also the description link previews show
    intro: { type: String, maxlength: 300, default: "" },
    bodyMarkdown: { type: String, required: true, maxlength: 25000 },
    // Only shown on the about page
    timeline: { type: [timelineEntrySchema], default: [] },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Page = mongoose.model("Page", pageSchema);
