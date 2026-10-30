// Authentication Middleware
import { strings } from "../config/constants.js";

/**
 * Send a signed-out visitor to the login page, coming back here afterwards. HTMX requests get
 * an HX-Redirect instead of a 302, which htmx would otherwise follow and swap into the page.
 */
function sendToLogin(req, res) {
  req.flash("error", strings.errors.loginRequired);
  const returnTo = req.get("HX-Request") ? req.get("HX-Current-URL") || req.originalUrl : req.originalUrl;
  const target = "/login?returnTo=" + encodeURIComponent(returnTo);

  if (req.get("HX-Request")) {
    res.set("HX-Redirect", target);
    return res.status(401).end();
  }
  return res.redirect(target);
}

/** Signed-in users only. */
function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  return sendToLogin(req, res);
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

/** Guard for the whole /admin router: signed-in admins only. */
function requireAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user?.isAdmin) return next();
  if (!req.isAuthenticated()) return sendToLogin(req, res);

  req.flash("error", strings.errors.accessDenied);
  if (req.get("HX-Request")) {
    res.set("HX-Redirect", "/");
    return res.status(403).end();
  }
  return res.redirect("/");
}

export default {
  requireLogin,
  ValidateLoggedOut,
  requireAdmin,
};
