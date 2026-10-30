import express from "express";

import { strings } from "../config/constants.js";

const ROUTER = express.Router();

// POST only, so lusca's CSRF check applies and another site can't sign the user out with a link
ROUTER.post("/", (req, res, next) => {
  // Nothing to do if they weren't signed in
  if (!req.isAuthenticated()) return res.redirect("/");

  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", strings.success.logoutSuccess);
    return res.redirect("/");
  });
});

export { ROUTER as logoutRoute };
