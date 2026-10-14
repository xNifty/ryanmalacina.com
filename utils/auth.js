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
 * Guard for the whole /admin router: signed-in admins only. Signed-out visitors go to the
 * login page and come back afterwards; HTMX requests get an HX-Redirect instead of a 302,
 * which htmx would otherwise follow and swap into the page.
 */
function requireAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user?.isAdmin) return next();

  let target = "/";
  if (req.isAuthenticated()) {
    req.flash("error", strings.errors.accessDenied);
  } else {
    req.flash("error", strings.errors.loginRequired);
    const returnTo = req.get("HX-Request") ? req.get("HX-Current-URL") || "/admin" : req.originalUrl;
    target = "/login?returnTo=" + encodeURIComponent(returnTo);
  }

  if (req.get("HX-Request")) {
    res.set("HX-Redirect", target);
    return res.status(req.isAuthenticated() ? 403 : 401).end();
  }
  return res.redirect(target);
}

export default {
  ValidateLoggedIn,
  ValidateLoggedOut,
  requireAdmin,
};
