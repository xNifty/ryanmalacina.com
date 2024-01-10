import express from "express";

import auth from "../utils/auth.js";
import { success } from "../config/constants.js";

const router = express.Router();

router.get("/", [auth.isLoggedIn], async (req, res, next) => {
  // Leaving this in place, on the off chance there isn't any JavaScript enabled
  req.logout(function (err) {
    req.flash("success", success.logoutSuccess);
    return res.redirect("/");
  });
});

router.post("/", async (req, res, next) => {
  if (req.isAuthenticated()) {
    req.logout(function (err) {
      req.flash("success", success.logoutSuccess);
      return res.send('{"success" : "Logged out success", "status" : 200}');
    });
    req.flash("success", success.logoutSuccess);
    return res.send('{"success" : "Logged out success", "status" : 200}');
  } else {
    return res.send("/");
  }
});

export { router as logoutRoute };
