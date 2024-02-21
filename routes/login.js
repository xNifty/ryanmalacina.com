import express from "express";
import passport from "passport";
import config from "config";

import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import ValidTarget from "../utils/validTarget.js";

const ROUTER = express.Router();

ROUTER.get("/", [auth.ValidateLoggedOut], async (req, res) => {
  return res.render("login", {
    title: strings.pageHeader.login,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.post(
  "/",
  [passport.authenticate("local", { failWithError: true })],
  function (req, res) {
    var returnTo = "";
    req.flash("success", strings.success.loginSuccess);
    if (req.query.returnTo !== undefined) {
      var returnToPath = new URL(req.query.returnTo, config.get("rootURL"));
      returnTo = returnToPath.toString();
    }
    if (returnTo === "" || returnTo === "undefined") res.redirect("/");
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

ROUTER.post(
  "/modal",
  passport.authenticate("local", { failWithError: true }),
  function (req, res) {
    var returnTo = "";
    req.flash("success", strings.success.loginSuccess);

    const HXReturnTo = req.get("HX-Current-URL");

    if (HXReturnTo !== undefined) {
      var returnTo = HXReturnTo;
      if (!ValidTarget(HXReturnTo)) {
        returnTo = "/";
      }
    } else {
      returnTo = "/";
    }

    res.set("HX-Location", returnTo);
    res.status(200).end();
  },
  function (err, req, res, next) {
    res.send(
      '<div class="modalAlert alert alert-danger alert-dismissible center-block text-center">Invalid username or password!</div>'
    );
    return;
  }
);

export { ROUTER as loginRoute };
