import express from 'express';
import auth from '../middleware/auth.js';
import { constants } from '../config/constants.js';
import { User } from '../models/user.js';

const router = express.Router();

router.get("/", [auth.isLoggedIn], async (req, res) => {
  return res.render("profile", {
      title: constants.pageHeader.profile,
      user_name: req.user.realName,
      user_email: req.user.email,
  });
});

router.post("/", [auth.isLoggedIn], async (req, res) => {
  var userName = req.body.user_name;
  console.log(req.body);
  console.log(userName);

  return res.redirect('/profile');
});

export {router as profileRoute };