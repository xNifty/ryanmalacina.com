import rateLimit from "express-rate-limit";

import { strings } from "../config/constants.js";

/**
 * Limit failed logins per IP. Successful logins (status < 400) are not counted,
 * so only bad passwords use up the allowance.
 * @param {Function} renderError - Builds the HTML alert for the endpoint's own error markup
 */
export function loginLimiter(renderError) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).send(renderError(strings.errors.tooManyLoginAttempts));
    },
  });
}

// Each reset request sends an email, so keep this tight
export const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    req.flash("error", strings.errors.tooManyRequests);
    res.redirect("/reset");
  },
});

export default { loginLimiter, resetLimiter };
