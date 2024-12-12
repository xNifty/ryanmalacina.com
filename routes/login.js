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
  function(req, res) {
    var returnTo = "";
    req.flash("success", strings.success.loginSuccess);

    const HXReturnTo = req.get("HX-Current-URL");

    if (HXReturnTo.includes("returnTo=")) {
      var parts = HXReturnTo.split("returnTo=");
      var returnParts = parts[1];
      returnParts = decodeURIComponent(returnParts);
      returnToPath = new URL(returnParts, config.get("rootURL"));
      returnTo = returnToPath.toString();
    } else {
      returnTo = "/";
    }

    if (req.query.returnTo !== undefined) {
      var returnToPath = new URL(req.query.returnTo, config.get("rootURL"));
      returnTo = returnToPath.toString();
    }

    if (returnTo !== undefined && returnTo !== "") {
      if (!ValidTarget(returnTo)) {
        returnTo = "/";
      }
    } else {
      returnTo = "/";
    }

    res.set("HX-Redirect", returnTo);
    res.send('<meta http-equiv="refresh" content="0');
    res.status(200).end();
  },
  function(err, req, res, next) {
    // console.log(err);
    res.send(
      `<div class="container">
    <div class="text-center">
        <div class="alert alert-danger center-block">
            <a href="#" class="alert-close" data-dismiss="alert" aria-label="close">&times;</a>
            Invalid username or password!
        </div>
    </div>
</div>`
    );
    return;
  }
);

ROUTER.post(
  "/modal",
  passport.authenticate("local", { failWithError: true }),
  function(req, res) {
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
  function(err, req, res, next) {
    res.send(
      '<div class="modalAlert alert alert-danger alert-dismissible center-block text-center">Invalid username or password!</div>'
    );
    return;
  }
);

export { ROUTER as loginRoute };
