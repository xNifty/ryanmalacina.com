import express from "express";

import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import { requestPasswordReset } from "../services/account.js";
import logErrorToFile from "../utils/errorLogging.js";
import { resetLimiter } from "../utils/rateLimits.js";

const ROUTER = express.Router();

ROUTER.get("/", [auth.ValidateLoggedOut], async (req, res) => {
  return res.render("reset", {
    hideLogin: true,
    title: strings.pageHeader.forgotPassword,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.post("/", resetLimiter, async function (req, res) {
  const email = req.body.email_one;

  if (email !== req.body.email_two) {
    req.flash("error", strings.errors.emailMismatch);
    return res.redirect("/reset");
  }

  try {
    await requestPasswordReset(email);
  } catch (error) {
    logErrorToFile(error);
  }

  // Same message whether or not the address has an account, so the form can't be used
  // to find out which emails are registered
  req.flash("success", strings.success.passwordResetSent);
  return res.redirect("/");
});

export { ROUTER as resetRoute };
