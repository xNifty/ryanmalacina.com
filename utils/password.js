import bcrypt from "bcrypt";

import { User } from "../models/user.js";
import { Token } from "../models/token.js";
import { sendMail } from "./sendMail.js";
import { renderEmail } from "./renderEmail.js";

export async function resetPassword(userId, token, password) {
  let passwordToken = await Token.findOne({ userId: { $eq: userId } });
  if (!passwordToken) return false;

  let isValid = await bcrypt.compare(token, passwordToken.token);
  if (!isValid) return false;

  let hash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT));

  await User.updateOne(
    { _id: { $eq: userId } },
    { $set: { password: hash } },
    { new: true }
  );

  let user = await User.findById({ _id: { $eq: userId } });

  const template = await renderEmail("passwordResetSuccess", { user: user.realName });

  await sendMail(
    process.env.mailgunFromEmail,
    user.email,
    "Password Changed",
    template,
    true
  );
  await passwordToken.deleteOne();

  return true;
}

export async function resetPasswordNoToken(userId, password) {
  if (!password) return false;

  const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT));

  return [true, hash];
}
