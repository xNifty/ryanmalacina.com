import express from 'express';
import auth from '../middleware/auth.js';
import { constants } from '../config/constants.js';
import { User } from '../models/user.js';
import { Token } from "../models/token.js";
import bcrypt from 'bcrypt';
import { sendMailNoRedirect } from '../functions/sendMail.js';

const router = express.Router();

router.get("/", [auth.isLoggedOut], async (req, res) => {
    return res.render("updatePassword", {
        layout: 'reset',
        title: constants.pageHeader.login
    });
});

router.post('/', function(req, res) {
  var password_one;
  var password_two;

  password_one = req.body.password_one;
  password_two = req.body.password_two;

  var userId = req.query.id;
  var token = req.query.token;

  if (password_one !== password_two) {
    req.flash('error', 'The entered passwords do not match.');
    return res.redirect('/updatePassword?token=' + token + '&id=' + userId);
  };

  var success = resetPassword(userId, token, password_one);

  if (success) {
    req.flash('success', 'Passwords have been changed successfully.');
    return res.redirect('/');
  } else {
    req.flash('error', 'There was an issue updating your password.');
    return res.redirect('/');
  }
});

async function resetPassword (userId, token, password) {
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
  sendMailNoRedirect(process.env.mailgunToEmail, user.email, "Password Changed", "Your password has been changed.");
  await passwordToken.deleteOne();

  return true;
}

export { router as passwordReset }
