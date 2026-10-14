import mongoose from "mongoose";

// Site-wide switches changed from /admin/settings. One document, _id "site".
const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "site" },
    // Blog link in the nav, recent posts on the home page, and the /blog redirect
    showBlog: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);
