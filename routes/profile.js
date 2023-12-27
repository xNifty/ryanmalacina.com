import express from "express";
import auth from "../middleware/auth.js";
import { pageHeader, profile } from "../config/constants.js";
import { User } from "../models/user.js";
import bcrypt from "bcrypt";
import { resetPasswordNoToken } from "../utils/password.js";
import logErrorToFile from "../utils/errorLogging.js";

const router = express.Router();

router.get("/", [auth.isLoggedIn], async (req, res) => {
  return res.render("profile", {
    layout: "profile",
    title: pageHeader.profile,
    user_name: req.user.realName,
    user_email: req.user.email,
    csrfToken: res.locals._csrf,
  });
});

router.post("/", [auth.isLoggedIn], async (req, res) => {
  var userName = req.body.user_name;
  var email = req.body.user_email;
  var passwordOne = req.body.pass_change_one;
  var passwordTwo = req.body.pass_change_two;
  var currentPassword = req.body.pass_current;

  if (passwordOne || passwordTwo) {
    if (passwordOne !== passwordTwo) {
      req.flash("error", profile.passwordsNotMatch);
      return res.redirect("/profile");
    } else {
      var user = await User.findOne({ _id: { $eq: req.user.id } });
      var originalPassword = user.password;

      const isValid = await bcrypt.compare(currentPassword, originalPassword);
      if (!isValid) {
        req.flash("error", profile.currentPasswordWrong);
        return res.redirect("/profile");
      }

      var reset = await resetPasswordNoToken(req.user.id, passwordOne);

      var success = reset[0];
      var hash = reset[1];

      if (success) {
        try {
          await User.updateOne(
            { _id: req.user.id },
            { $set: { password: hash, email: email, real_name: userName } },
            { new: true }
          );
          req.flash("success", profile.profileUpdateSuccess);
        } catch (error) {
          logErrorToFile(error);
          req.flash("error", profile.profileUpdateError);
        }
      } else {
        req.flash("error", profile.profileUpdateError);
      }
    }
  } else {
    try {
      await User.updateOne(
        { _id: req.user.id },
        { $set: { email: email, realName: userName } },
        { new: true }
      );
      req.flash("success", profile.profileUpdateSuccess);
    } catch (error) {
      logErrorToFile(error);
      req.flash("error", profile.profileUpdateError);
    }
  }

  return res.redirect("/profile");
});

export { router as profileRoute };
