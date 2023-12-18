import express from "express";
import auth from "../middleware/auth.js";
import { pageHeader } from "../config/constants.js";
import { resetPassword } from "../functions/password.js";

const router = express.Router();

router.get("/", [auth.isLoggedOut], async (req, res) => {
  return res.render("resetPassword", {
    layout: "reset",
    title: pageHeader.login,
  });
});

router.post("/", function (req, res) {
  var password_one;
  var password_two;

  password_one = req.body.password_one;
  password_two = req.body.password_two;

  var userId = req.query.id;
  var token = req.query.token;

  if (password_one !== password_two) {
    req.flash("error", "The entered passwords do not match.");
    return res.redirect("/updatePassword?token=" + token + "&id=" + userId);
  }

  var success = resetPassword(userId, token, password_one);

  if (success) {
    req.flash("success", "Your password has been changed successfully.");
    return res.redirect("/");
  } else {
    req.flash("error", "There was an issue updating your password.");
    return res.redirect("/");
  }
});

export { router as passwordReset };
