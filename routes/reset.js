import express from "express";
import crypto from "crypto";
import config from "config";
import bcrypt from "bcrypt";

import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";
import { User } from "../models/user.js";
import { Token } from "../models/token.js";
import { sendMail } from "../utils/sendMail.js";
import logErrorToFile from "../utils/errorLogging.js";
import { resetLimiter } from "../utils/rateLimits.js";
import { renderEmail } from "../utils/renderEmail.js";

const ROUTER = express.Router();

const FROM_EMAIL = process.env.mailgunFromEmail;
const BCRYPT_SALT = process.env.BCRYPT_SALT;

ROUTER.get("/", [auth.ValidateLoggedOut], async (req, res) => {
  return res.render("reset", {
    hideLogin: true,
    title: strings.pageHeader.forgotPassword,
    csrfToken: res.locals._csrf,
  });
});

ROUTER.post("/", resetLimiter, async function (req, res) {
  let emailOne = req.body.email_one;
  let emailTwo = req.body.email_two;

  if (emailOne !== emailTwo) {
    req.flash("error", strings.errors.emailMismatch);
    return res.redirect("/reset");
  }

  let resetStatus = await resetPassword(emailOne);

  if (resetStatus) {
    req.flash("success", strings.success.passwordResetSent);
    return res.redirect("/");
  } else {
    req.flash("error", strings.errors.passwordChangeFail);
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

    await sendMail(
      FROM_EMAIL,
      user.email,
      "Password Reset Email",
      template,
      true
    );

    return true;
  } catch (error) {
    logErrorToFile(error);
    return false;
  }
};

const deleteExistingToken = async (userId) => {
  const token = await Token.findOne({ userId: { $eq: userId } });
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

const generateEmailTemplate = (userName, link, invalidateLink) => {
  return renderEmail("passwordReset", { user: userName, link, invalidateLink });
};

export { ROUTER as resetRoute };
