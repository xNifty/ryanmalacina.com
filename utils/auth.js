// Authentication Middleware
import { errors } from "../config/constants.js";
import handleResponse from "./responseHandler.js";

// Make sure the user is logged in, and if not, redirect to login with a message
export function loggedInOnly(req, res, next) {
  if (req.isAuthenticated()) next();
  else {
    var returnTo = "";
    returnTo = req.originalUrl;
    if (returnTo !== "/logout") {
      req.flash("error", errors.loginRequired);
      res.status(401);
      if (returnTo === "") res.redirect("/login");
      else res.redirect("/login?returnTo=" + returnTo);
    } else {
      // Just redirect if trying to access /logout when not even logged in
      res.redirect("/");
    }
  }
}

// Only allow unauthenticated users access (e.g. for /login)
export function loggedOutOnly(req, res, next) {
  if (req.isUnauthenticated()) next();
  else res.redirect("/");
}

// Make sure the user is an admin
export function ValidateAdmin(req, res, next) {
  if (req.user.isAdmin) next();
  else {
    req.flash("error", errors.accessDenied);
    res.status(401);
    res.redirect("/");
  }
}

var isLoggedIn = loggedInOnly;
var isLoggedOut = loggedOutOnly;
var isAdmin = ValidateAdmin;

export default {
  isLoggedIn,
  isLoggedOut,
  isAdmin,
};
