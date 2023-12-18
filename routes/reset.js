import express from "express";
import auth from "../middleware/auth.js";
import { constants } from "../config/constants.js";
import { User } from "../models/user.js";
import { Token } from "../models/token.js";
import bcrypt from "bcrypt";
import { sendMailNoRedirect } from "../functions/sendMail.js";
import crypto from "crypto";
import config from "config";
import fs from "fs";
import path from "path";

const router = express.Router();

router.get("/", [auth.isLoggedOut], async (req, res) => {
  return res.render("reset", {
    layout: "reset",
    title: constants.pageHeader.forgotPassword,
  });
});

router.post("/", function (req, res) {
  var emailOne;
  var emailTwo;

  emailOne = req.body.email_one;
  emailTwo = req.body.email_two;

  // console.log(`${emailOne}, ${emailTwo}`);

  if (emailOne !== emailTwo) {
    console.log("email fail");
    req.flash("success", constants.success.passwordResetSent);
    return res.redirect("/");
  }

  resetPassword(emailOne, req, res);
  req.flash("success", constants.success.passwordResetSent);
  return res.redirect("/");
});

const resetPassword = async (email, req, res) => {
  const user = await User.findOne({ email });

  const __dirname = path.resolve();
  const filePath = path.join(
    __dirname,
    "/views/layouts/templates/passwordReset.handlebars"
  );
  const source = fs.readFileSync(filePath, "utf-8").toString();
  var template = source;

  if (!user) {
    return false;
  }

  let token = await Token.findOne({ userId: user._id });
  if (token) await token.deleteOne();

  let resetToken = crypto.randomBytes(32).toString("hex");
  const hash = await bcrypt.hash(resetToken, Number(process.env.BCRYPT_SALT));

  const fromEmail = process.env.mailgunFromEmail;

  await new Token({
    userId: user._id,
    token: hash,
    createdAt: Date.now(),
  }).save();

  const link = `${config.get("rootURL")}/resetPassword?token=${resetToken}&id=${
    user._id
  }`;

  template = template.replace("{{user}}", user.realName);
  template = template.replace("{{link}}", link);

  // console.log(template);

  sendMailNoRedirect(
    fromEmail,
    user.email,
    "Password Reset Email",
    template,
    true
  );
  return true;
};

export { router as resetRoute };
