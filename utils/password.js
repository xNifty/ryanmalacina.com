import { User } from "../models/user.js";
import { Token } from "../models/token.js";
import bcrypt from "bcrypt";
import { sendMailNoRedirect } from "./sendMail.js";
import fs from "fs";
import path from "path";

export async function resetPassword(userId, token, password) {
  let passwordToken = await Token.findOne({ userId });
  if (!passwordToken) return false;

  const isValid = await bcrypt.compare(token, passwordToken.token);
  if (!isValid) return false;

  const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT));

  await User.updateOne(
    { _id: userId },
    { $set: { password: hash } },
    { new: true }
  );

  const __dirname = path.resolve();
  const filePath = path.join(
    __dirname,
    "/views/layouts/templates/passwordResetSuccess.handlebars"
  );
  const source = fs.readFileSync(filePath, "utf-8").toString();
  var template = source;

  const user = await User.findById({ _id: userId });

  template = template.replace("{{user}}", user.realName);

  await sendMailNoRedirect(
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
