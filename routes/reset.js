import express from 'express';
import auth from '../middleware/auth.js';
import { constants } from '../config/constants.js';
import { User } from '../models/user.js';
import { Token } from "../models/token.js";
import bcrypt from 'bcrypt';
import sendMail, { sendMailNoRedirect } from '../functions/sendMail.js';
import crypto from 'crypto';
import config from "config";

const router = express.Router();

router.get("/", [auth.isLoggedOut], async (req, res) => {
    return res.render("reset", {
        layout: 'reset',
        title: constants.pageHeader.login
    });
});

router.post('/', function(req, res) {
  var emailOne;
  var emailTwo;

  emailOne = req.body.email_one;
  emailTwo = req.body.email_two;

  console.log(`${emailOne}, ${emailTwo}`);

  if (emailOne !== emailTwo) {
    console.log("email fail");
    req.flash('success', 'If a matching email was found a reset link has been sent.');
    return res.redirect('/');
  }

  resetPassword(emailOne, req, res);
  req.flash('success', 'If a matching email was found a reset link has been sent.');
  return res.redirect('/');

});

const resetPassword = async(email, req, res) => {
  const user = await User.findOne({ email });

  if (!user) {
    return false;
  }

  let token = await Token.findOne({userId: user._id});
  if (token) await token.deleteOne();

  let resetToken = crypto.randomBytes(32).toString("hex");
  const hash = await bcrypt.hash(resetToken, Number(process.env.BCRYPT_SALT));

  const fromEmail = process.env.mailgunToEmail;

  console.log(fromEmail);
  console.log(user.email);

  await new Token ({
    userId: user._id,
    token: hash,
    createdAt: Date.now(),
  }).save();

  const link = `${config.get('rootURL')}/passwordReset?token=${resetToken}&id=${user._id}`;
  var subject = `Hello, ${user.realName},
  
You requested a new password. You can do so by clicking the following: 

${link}`
  sendMailNoRedirect(fromEmail, user.email, 'Password Reset Email', subject);
  return true;
};

// router.post('/modal', passport.authenticate("local", { failWithError: true }),
//     function(req, res) {
//         var returnTo = '';
//         req.flash('success', constants.success.loginSuccess);
//         if (req.query.returnTo !== undefined)
//             var returnTo = req.query.returnTo;

//         if (returnTo === '')
//             res.redirect('/');
//         else
//             res.redirect(returnTo);
//     },
//     function(err, req, res, next) {
//         if (req.session.returnTo == null) {
//             return res.send('{"error" : "Login failed", "status" : 400}');
//         } else {
//             req.flash('error', constants.errors.invalidLogin);
//             return res.redirect('/login');
//         }
//     }
// );

export { router as resetRoute }
