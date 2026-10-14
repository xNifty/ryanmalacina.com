import express from "express";
import passport from "passport";
import config from "config";

import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import ValidTarget from "../utils/validTarget.js";
import { loginLimiter } from "../utils/rateLimits.js";

const ROUTER = express.Router();

function getSafeReturnTo(req) {
  const rootURL = config.get("rootURL");
  let returnTo = "/";

  try {
    if (typeof req.query.returnTo === "string" && req.query.returnTo !== "") {
      returnTo = new URL(req.query.returnTo, rootURL).toString();
    } else {
      const currentURL = req.get("HX-Current-URL");

      if (currentURL) {
        const parsedCurrentURL = new URL(currentURL, rootURL);
        const nestedReturnTo = parsedCurrentURL.searchParams.get("returnTo");

        if (nestedReturnTo) {
          returnTo = new URL(nestedReturnTo, rootURL).toString();
        } else if (parsedCurrentURL.pathname !== "/login") {
          returnTo = parsedCurrentURL.toString();
        }
      }
    }
  } catch (err) {
    returnTo = "/";
  }

  return ValidTarget(returnTo) ? returnTo : "/";
}

function pageAlert(message) {
  return `<div class="container">
    <div class="text-center">
        <div class="alert alert-danger center-block">
            <a href="#" class="alert-close" data-dismiss="alert" aria-label="close">&times;</a>
            ${message}
        </div>
    </div>
</div>`;
}

function modalAlert(message) {
  return `<div class="modalAlert alert alert-danger alert-dismissible center-block text-center">${message}</div>`;
}

ROUTER.get("/", [auth.ValidateLoggedOut], async (req, res) => {
  return res.render("login", {
    title: strings.pageHeader.login,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.post(
  "/",
  [loginLimiter(pageAlert), passport.authenticate("local", { failWithError: true })],
  function(req, res) {
    const returnTo = getSafeReturnTo(req);
    req.flash("success", strings.success.loginSuccess);

    if (req.get("HX-Request")) {
      res.set("HX-Redirect", returnTo);
      return res.status(200).end();
    }

    return res.redirect(returnTo);
  },
  function(err, req, res, next) {
    res.send(pageAlert(strings.errors.invalidLogin));
  }
);

ROUTER.post(
  "/modal",
  [loginLimiter(modalAlert), passport.authenticate("local", { failWithError: true })],
  function(req, res) {
    const returnTo = getSafeReturnTo(req);
    req.flash("success", strings.success.loginSuccess);

    if (req.get("HX-Request")) {
      res.set("HX-Redirect", returnTo);
      return res.status(200).end();
    }

    return res.redirect(returnTo);
  },
  function(err, req, res, next) {
    res.send(modalAlert(strings.errors.invalidLogin));
  }
);

export { ROUTER as loginRoute };
