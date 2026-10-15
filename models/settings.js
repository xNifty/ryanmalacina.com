import mongoose from "mongoose";

// Site-wide switches changed from /admin/settings. One document, _id "site".
const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "site" },
    // Blog link in the nav, recent posts on the home page, and the /blog redirect
    showBlog: { type: Boolean, default: false },
    // The site's accent colour per theme, as #rrggbb; empty uses the stylesheet's
    accentLight: { type: String, maxlength: 7 },
    accentDark: { type: String, maxlength: 7 },
    // The home page terminal, "key: value" per line
    heroLines: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);
