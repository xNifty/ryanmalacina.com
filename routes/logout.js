import express from "express";

import auth from "../utils/auth.js";
import { strings } from "../config/constants.js";

const ROUTER = express.Router();

ROUTER.get("/", [auth.ValidateLoggedIn()], async (req, res, next) => {
  // Leaving this in place, on the off chance there isn't any JavaScript enabled
  req.logout(function (err) {
    req.flash("success", strings.success.logoutSuccess);
    return res.redirect("/");
  });
});

ROUTER.post("/", async (req, res, next) => {
  if (req.isAuthenticated()) {
    req.logout(function (err) {
      req.flash("success", strings.success.logoutSuccess);
      return res.send('{"success" : "Logged out success", "status" : 200}');
    });
    req.flash("success", strings.success.logoutSuccess);
    return res.send('{"success" : "Logged out success", "status" : 200}');
  } else {
    console.log("Not logged in, so can't log out");
    return res.send("/");
  }
});

export { ROUTER as logoutRoute };
