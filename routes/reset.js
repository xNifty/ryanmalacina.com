import express from "express";
import crypto from "crypto";
import config from "config";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";

import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import { User } from "../models/user.js";
import { Token } from "../models/token.js";
import { sendMail } from "../utils/sendMail.js";

const ROUTER = express.Router();

const FROM_EMAIL = process.env.mailgunFromEmail;
const BCRYPT_SALT = process.env.BCRYPT_SALT;

ROUTER.get("/", [auth.ValidateLoggedOut], async (req, res) => {
  return res.render("reset", {
    layout: "reset",
    title: strings.pageHeader.forgotPassword,
  });
});

ROUTER.post("/", async function (req, res) {
  let emailOne = req.body.email_one;
  let emailTwo = req.body.email_two;

  if (emailOne !== emailTwo) {
    req.flash("errors", errors.emailMismatch);
    return res.redirect("/");
  }

  let resetStatus = await resetPassword(emailOne);

  if (resetStatus) {
    req.flash("success", strings.success.passwordResetSent);
    return res.redirect("/");
  } else {
    req.flash("error", errors.passwordChangeFail);
    return res.redirect("/");
  }
});

const resetPassword = async (email) => {
  try {
    const user = await User.findOne({ email: { $eq: email } });

    if (!user) {
      return false;
    }

    await deleteExistingToken(user._id);

    const resetToken = await generateResetToken();
    const hash = await bcrypt.hash(resetToken, Number(BCRYPT_SALT));

    await saveTokenToDatabase(user._id, hash);

    const resetLink = generateResetLink(user._id, resetToken);
    const invalidateLink = generateInvalidateLink(user._id, resetToken);

    const template = await generateEmailTemplate(
      user.realName,
      resetLink,
      invalidateLink
    );

    await sendPasswordResetEmail(FROM_EMAIL, user.email, template);

    return true;
  } catch (error) {
    logErrorToFile(error);
    return false;
  }
};

const deleteExistingToken = async (userId) => {
  const token = await Token.findOne({ _id: { $eq: userId } });
  if (token) await token.deleteOne();
};

const generateResetToken = async () => {
  return crypto.randomBytes(32).toString("hex");
};

const saveTokenToDatabase = async (userId, hash) => {
  await new Token({
    userId,
    token: hash,
    createdAt: Date.now(),
  }).save();
};

const generateResetLink = (userId, resetToken) => {
  return `${config.get(
    "rootURL"
  )}/resetPassword?token=${resetToken}&id=${userId}`;
};

const generateInvalidateLink = (userId, resetToken) => {
  return `${config.get(
    "rootURL"
  )}/resetPassword/invalidate?token=${resetToken}&id=${userId}`;
};

const generateEmailTemplate = async (userName, link, invalidateLink) => {
  try {
    const __dirname = path.resolve();
    const templatePath = path.join(
      __dirname,
      "/views/layouts/templates/passwordReset.handlebars"
    );
    const source = await fs.promises.readFile(templatePath, "utf-8");
    return source
      .replace("{{user}}", userName)
      .replace("{{link}}", link)
      .replace("{{invalidateLink}}", invalidateLink);
  } catch (error) {
    console.error("Error generating email template:", error);
    throw error;
  }
};

const sendPasswordResetEmail = async (fromEmail, toEmail, template) => {
  await sendMail(fromEmail, toEmail, "Password Reset Email", template, true);
};

export { ROUTER as resetRoute };
