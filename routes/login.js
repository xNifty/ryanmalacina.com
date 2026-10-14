import express from "express";
import passport from "passport";
import config from "config";

import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import ValidTarget from "../utils/validTarget.js";
import { loginLimiter } from "../utils/rateLimits.js";
import { renderAlert } from "../utils/renderPartial.js";

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

const PAGE_ALERT = "partials/alert";
const MODAL_ALERT = "partials/modal-alert";

// Passport's failWithError hands us a 401 for bad credentials; anything else is a real error
function loginFailure(view) {
  return function(err, req, res, next) {
    if (err.status !== 401) return next(err);
    return renderAlert(res, "danger", strings.errors.invalidLogin, { view });
  };
}

function loginSuccess(req, res) {
  const returnTo = getSafeReturnTo(req);
  req.flash("success", strings.success.loginSuccess);

  if (req.get("HX-Request")) {
    res.set("HX-Redirect", returnTo);
    return res.status(200).end();
  }

  return res.redirect(returnTo);
}

ROUTER.get("/", [auth.ValidateLoggedOut], async (req, res) => {
  return res.render("login", {
    title: strings.pageHeader.login,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.post(
  "/",
  [loginLimiter(PAGE_ALERT), passport.authenticate("local", { failWithError: true })],
  loginSuccess,
  loginFailure(PAGE_ALERT)
);

ROUTER.post(
  "/modal",
  [loginLimiter(MODAL_ALERT), passport.authenticate("local", { failWithError: true })],
  loginSuccess,
  loginFailure(MODAL_ALERT)
);

export { ROUTER as loginRoute };
