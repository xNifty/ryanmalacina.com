import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

import { User } from "../models/user.js";
import { Token } from "../models/token.js";
import { sendMail } from "./sendMail.js";

// Define consts
const __dirname = path.resolve();
const filePath = path.join(
  __dirname,
  "/views/layouts/templates/passwordResetSuccess.handlebars"
);
const source = fs.readFileSync(filePath, "utf-8").toString();

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

  var template = source;

  let user = await User.findById({ _id: { $eq: userId } });

  template = template.replace("{{user}}", user.realName);

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
