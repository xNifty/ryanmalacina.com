import express from "express";
import passport from "passport";
import config from "config";

import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import ValidTarget from "../utils/validTarget.js";

const router = express.Router();

router.get("/", [auth.ValidateLoggedOut], async (req, res) => {
  return res.render("login", {
    title: strings.pageHeader.login,
    csrfToken: res.locals._csrf,
  });
});

router.post(
  "/",
  [passport.authenticate("local", { failWithError: true })],
  function (req, res) {
    var returnTo = "";
    req.flash("success", strings.success.loginSuccess);
    if (req.query.returnTo !== undefined) {
      var returnToPath = new URL(req.query.returnTo, config.get("rootURL"));
      returnTo = returnToPath.toString();
    }
    if (returnTo === "") res.redirect("/");
    else {
      if (ValidTarget(returnTo)) res.redirect(returnTo);
      else res.redirect("/");
    }
  },
  function (err, req, res, next) {
    if (req.query.returnTo !== null) {
      req.flash("error", strings.errors.invalidLogin);
      return res.redirect("/login?returnTo=" + req.query.returnTo);
    } else {
      req.flash("error", strings.errors.invalidLogin);
      return res.redirect("/login");
    }
  }
);

router.post(
  "/modal",
  passport.authenticate("local", { failWithError: true }),
  function (req, res) {
    var returnTo = "";
    req.flash("success", strings.success.loginSuccess);
    if (req.query.returnTo !== undefined) var returnTo = req.query.returnTo;

    if (returnTo === "") res.redirect("/");
    else {
      if (ValidTarget(returnTo)) res.redirect(returnTo);
      else res.redirect("/");
    }
  },
  function (err, req, res, next) {
    if (req.session.returnTo == null) {
      return res.send('{"error" : "Login failed", "status" : 400}');
    } else {
      req.flash("error", strings.errors.invalidLogin);
      return res.redirect("/login");
    }
  }
);

export { router as loginRoute };
