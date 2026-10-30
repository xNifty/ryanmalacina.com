import express from "express";

import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import { completePasswordReset, invalidatePasswordReset } from "../services/account.js";
import logErrorToFile from "../utils/errorLogging.js";

const ROUTER = express.Router();

ROUTER.get("/", [auth.ValidateLoggedOut], async (req, res) => {
  return res.render("resetPassword", {
    hideLogin: true,
    title: strings.pageHeader.forgotPassword,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.post("/", async function (req, res) {
  const { id: userId, token } = req.query;
  const password = req.body.password_one;
  const backToForm =
    "/resetPassword?" + new URLSearchParams({ token: String(token ?? ""), id: String(userId ?? "") });

  if (password !== req.body.password_two) {
    req.flash("error", strings.errors.passwordsDontMatch);
    return res.redirect(backToForm);
  }

  let outcome;
  try {
    outcome = await completePasswordReset(userId, token, password);
  } catch (error) {
    logErrorToFile(error);
    outcome = "error";
  }

  if (outcome === "weakPassword") {
    req.flash("error", strings.errors.passwordTooShort);
    return res.redirect(backToForm);
  }

  if (outcome === "changed") {
    req.flash("success", strings.success.passwordChanged);
  } else {
    req.flash("error", strings.errors.passwordChangeFail);
  }
  return res.redirect("/");
});

ROUTER.get("/invalidate", async function (req, res) {
  let invalidated = false;
  try {
    invalidated = await invalidatePasswordReset(req.query.id, req.query.token);
  } catch (error) {
    logErrorToFile(error);
  }

  if (invalidated) {
    req.flash("success", strings.success.resetInvalidated);
  } else {
    req.flash("error", strings.errors.invalidToken);
  }
  return res.redirect("/");
});

export { ROUTER as passwordResetRoute };
