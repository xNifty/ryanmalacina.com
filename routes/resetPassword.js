import express from "express";
import bcrypt from "bcrypt";

import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import { resetPassword } from "../utils/password.js";
import { Token } from "../models/token.js";

const router = express.Router();

router.get("/", [auth.ValidateLoggedOut], async (req, res) => {
  return res.render("resetPassword", {
    hideLogin: true,
    title: strings.pageHeader.forgotPassword,
    csrfToken: res.locals._csrf,
  });
});

router.post("/", async function (req, res) {
  var password_one;
  var password_two;

  password_one = req.body.password_one;
  password_two = req.body.password_two;

  var userId = req.query.id;
  var token = req.query.token;

  if (password_one !== password_two) {
    req.flash("error", strings.errors.passwordsDontMatch);
    return res.redirect("/resetPassword?token=" + token + "&id=" + userId);
  }

  var resetSuccess = await resetPassword(userId, token, password_one);

  if (resetSuccess) {
    req.flash("success", strings.success.passwordChanged);
    return res.redirect("/");
  } else {
    req.flash("error", strings.errors.passwordChangeFail);
    return res.redirect("/");
  }
});

router.get("/invalidate", async function (req, res) {
  var userId = req.query.id;
  var token = req.query.token;

  if (typeof userId !== "string" || typeof token !== "string") {
    req.flash("error", strings.errors.invalidToken);
    return res.redirect("/");
  }

  let passwordToken = await Token.findOne({ userId: { $eq: userId } });
  if (!passwordToken) {
    req.flash("error", strings.errors.invalidToken);
    return res.redirect("/");
  }

  const isValid = await bcrypt.compare(token, passwordToken.token);
  if (!isValid) {
    req.flash("error", strings.errors.invalidToken);
    return res.redirect("/");
  }

  await passwordToken.deleteOne();
  req.flash("success", strings.success.resetInvalidated);
  return res.redirect("/");
});

export { router as passwordReset };
