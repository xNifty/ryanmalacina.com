import express from "express";

import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import { updateProfile } from "../services/account.js";
import logErrorToFile from "../utils/errorLogging.js";

const ROUTER = express.Router();

const PROFILE_MESSAGES = {
  updated: ["success", strings.profile.profileUpdateSuccess],
  wrongPassword: ["error", strings.profile.currentPasswordWrong],
  weakPassword: ["error", strings.profile.passwordTooShort],
  notFound: ["error", strings.profile.profileUpdateError],
};

ROUTER.get("/", [auth.ValidateLoggedIn()], async (req, res) => {
  return res.render("profile", {
    pageScripts: ["profile.js"],
    title: strings.pageHeader.profile,
    user_name: req.user.realName,
    user_email: req.user.email,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.post("/", [auth.ValidateLoggedIn()], async (req, res) => {
  const newPassword = req.body.pass_change_one;
  const confirmPassword = req.body.pass_change_two;
  const changingPassword = Boolean(newPassword || confirmPassword);

  if (changingPassword && newPassword !== confirmPassword) {
    req.flash("error", strings.profile.passwordsNotMatch);
    return res.redirect("/profile");
  }

  let outcome;
  try {
    outcome = await updateProfile(req.user.id, {
      realName: req.body.user_name,
      email: req.body.user_email,
      currentPassword: req.body.pass_current,
      newPassword: changingPassword ? newPassword : undefined,
    });
  } catch (error) {
    // Includes schema validation failures, e.g. an empty name or email
    logErrorToFile(error);
    outcome = "notFound";
  }

  req.flash(...PROFILE_MESSAGES[outcome]);
  return res.redirect("/profile");
});

export { ROUTER as profileRoute };
