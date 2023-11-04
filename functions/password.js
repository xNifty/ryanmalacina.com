import { User } from '../models/user.js';
import { Token } from "../models/token.js";
import bcrypt from 'bcrypt';
import { sendMailNoRedirect } from '../functions/sendMail.js';
import { constants } from '../config/constants.js';

export async function resetPassword (userId, token, password) {
  let passwordToken = await Token.findOne({userId});
  if (!passwordToken)
    return false;

  const isValid = await bcrypt.compare(token, passwordToken.token);
  if (!isValid)
    return false;

  const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT))

  await User.updateOne(
    {_id: userId},
    {$set: {password: hash}},
    {new: true}
  );

  const user = await User.findById({_id: userId});
  sendMailNoRedirect(process.env.mailgunToEmail, user.email, "Password Changed", constants.success.passwordChanged);
  await passwordToken.deleteOne();

  return true;
}

export async function resetPasswordNoToken (userId, password) {
  if (!password)
    return false;

  const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT))

  return [true, hash];
}