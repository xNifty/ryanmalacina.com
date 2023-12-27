import express from "express";
import passport from "passport";
import auth from "../middleware/auth.js";
import { pageHeader, success, errors } from "../config/constants.js";
import isLocalUrl from "../utils/validTarget.js";
const router = express.Router();

router.get("/", [auth.isLoggedOut], async (req, res) => {
  return res.render("login", {
    title: pageHeader.login,
    csrfToken: res.locals._csrf,
  });
});

router.post(
  "/",
  [passport.authenticate("local", { failWithError: true })],
  function (req, res) {
    var returnTo = "";
    req.flash("success", success.loginSuccess);
    if (req.query.returnTo !== undefined) var returnTo = req.query.returnTo;

    if (returnTo === "") res.redirect("/");
    else {
      if (isLocalUrl(returnTo)) res.redirect(returnTo);
      else res.redirect("/");
    }
  },
  function (err, req, res, next) {
    if (req.query.returnTo !== null) {
      req.flash("error", errors.invalidLogin);
      return res.redirect("/login?returnTo=" + req.query.returnTo);
    } else {
      req.flash("error", errors.invalidLogin);
      return res.redirect("/login");
    }
  }
);

router.post(
  "/modal",
  passport.authenticate("local", { failWithError: true }),
  function (req, res) {
    var returnTo = "";
    req.flash("success", success.loginSuccess);
    if (req.query.returnTo !== undefined) var returnTo = req.query.returnTo;

    if (returnTo === "") res.redirect("/");
    else {
      if (isLocalUrl(returnTo)) res.redirect(returnTo);
      else res.redirect("/");
    }
  },
  function (err, req, res, next) {
    if (req.session.returnTo == null) {
      return res.send('{"error" : "Login failed", "status" : 400}');
    } else {
      req.flash("error", errors.invalidLogin);
      return res.redirect("/login");
    }
  }
);

export { router as loginRoute };
