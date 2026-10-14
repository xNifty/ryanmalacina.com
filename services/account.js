/*
  Account data access: profile changes and the password reset flow.
*/
import crypto from "crypto";
import bcrypt from "bcrypt";
import config from "config";
import mongoose from "mongoose";

import { User } from "../models/user.js";
import { Token } from "../models/token.js";
import { sendMail } from "../utils/sendMail.js";
import { renderEmail } from "../utils/renderEmail.js";

export const MIN_PASSWORD_LENGTH = 8;

function saltRounds() {
  return Number(process.env.BCRYPT_SALT) || 12;
}

export function isAcceptablePassword(password) {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}

/**
 * Update the signed-in user's name and email, and optionally their password.
 * @param {string} userId
 * @param {Object} changes - realName, email, and for a password change: currentPassword, newPassword
 * @returns {Promise<"updated"|"wrongPassword"|"weakPassword"|"notFound">}
 */
export async function updateProfile(userId, { realName, email, currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) return "notFound";

  const update = { realName, email };

  if (newPassword !== undefined) {
    if (!isAcceptablePassword(newPassword)) return "weakPassword";
    if (typeof currentPassword !== "string" || !(await user.validPassword(currentPassword))) {
      return "wrongPassword";
    }
    update.password = await bcrypt.hash(newPassword, saltRounds());
  }

  // runValidators so an empty name or email is rejected rather than saved
  await User.updateOne({ _id: user._id }, { $set: update }, { runValidators: true });
  return "updated";
}

/**
 * Email a reset link if the address belongs to an account. Callers should show the same
 * message either way so the form doesn't reveal which addresses have accounts.
 * @returns {Promise<boolean>} - Whether an email was sent
 */
export async function requestPasswordReset(email) {
  if (typeof email !== "string" || email === "") return false;

  const user = await User.findOne({ email: { $eq: email } });
  if (!user) return false;

  await Token.deleteMany({ userId: user._id });

  const resetToken = crypto.randomBytes(32).toString("hex");
  await new Token({
    userId: user._id,
    token: await bcrypt.hash(resetToken, saltRounds()),
  }).save();

  const query = `token=${resetToken}&id=${user._id}`;
  const rootURL = config.get("rootURL");
  const html = await renderEmail("passwordReset", {
    user: user.realName,
    link: `${rootURL}/resetPassword?${query}`,
    invalidateLink: `${rootURL}/resetPassword/invalidate?${query}`,
  });

  return sendMail(process.env.mailgunFromEmail, user.email, "Password Reset Email", html, true);
}

/**
 * @returns {Promise<Object|null>} - The stored token document if this id/token pair is valid
 */
async function findValidToken(userId, token) {
  if (typeof userId !== "string" || typeof token !== "string") return null;
  if (!mongoose.isValidObjectId(userId)) return null;

  const stored = await Token.findOne({ userId: { $eq: userId } });
  if (!stored) return null;

  return (await bcrypt.compare(token, stored.token)) ? stored : null;
}

/**
 * Set a new password from a reset link, then email a confirmation.
 * @returns {Promise<"changed"|"invalidToken"|"weakPassword">}
 */
export async function completePasswordReset(userId, token, password) {
  if (!isAcceptablePassword(password)) return "weakPassword";

  const stored = await findValidToken(userId, token);
  if (!stored) return "invalidToken";

  const user = await User.findById(userId);
  if (!user) return "invalidToken";

  await User.updateOne(
    { _id: user._id },
    { $set: { password: await bcrypt.hash(password, saltRounds()) } }
  );
  await stored.deleteOne();

  const html = await renderEmail("passwordResetSuccess", { user: user.realName });
  await sendMail(process.env.mailgunFromEmail, user.email, "Password Changed", html, true);

  return "changed";
}

/**
 * Cancel a pending reset from the link in the reset email.
 * @returns {Promise<boolean>} - Whether a matching reset was found and removed
 */
export async function invalidatePasswordReset(userId, token) {
  const stored = await findValidToken(userId, token);
  if (!stored) return false;

  await stored.deleteOne();
  return true;
}

export default {
  MIN_PASSWORD_LENGTH,
  isAcceptablePassword,
  updateProfile,
  requestPasswordReset,
  completePasswordReset,
  invalidatePasswordReset,
};
