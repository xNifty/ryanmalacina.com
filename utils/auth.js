// Authentication Middleware
import { strings } from "../config/constants.js";
import handleResponse from "./responseHandler.js";

/**
 * @param {boolean} isJson - Whether the request is expecting a JSON response
 * @returns {Function} - The middleware function
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 * @returns {void}
 * @description Make sure the user is logged in before proceeding
 */
function ValidateLoggedIn(isJson = false) {
  return function(req, res, next) {
    if (req.isAuthenticated()) next();
    else {
      var returnTo = "";
      returnTo = req.originalUrl;
      if (!isJson) {
        if (returnTo !== "/logout") {
          req.flash("error", strings.errors.loginRequired);
          res.status(401);
          if (returnTo === "") res.redirect("/login");
          else res.redirect("/login?returnTo=" + returnTo);
        } else {
          // Just redirect if trying to access /logout when not even logged in
          res.redirect("/");
        }
      } else {
        req.flash("error", strings.errors.loginRequired);
        res.status(401);
        return handleResponse(res, "Unauthorized", 401);
      }
    }
  };
}

/**
  * @param {Object} req - The request object
  * @param {Object} res - The response object
  * @param {Function} next - The next middleware function
  * @returns {void}
  * @description Make sure the user is logged out before proceeding
*/
function ValidateLoggedOut(req, res, next) {
  if (req.isUnauthenticated()) next();
  else res.redirect("/");
}

/**
  * @param {Object} req - The request object
  * @param {Object} res - The response object
  * @param {Function} next - The next middleware function
  * @returns {void}
  * @description Make sure the user is an admin
*/
function ValidateAdmin(req, res, next) {
  if (req.user.isAdmin) next();
  else {
    req.flash("error", strings.errors.accessDenied);
    res.status(401);
    res.redirect("/");
  }
}

export default {
  ValidateLoggedIn,
  ValidateLoggedOut,
  ValidateAdmin,
};
