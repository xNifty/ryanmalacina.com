import rateLimit from "express-rate-limit";

import { strings } from "../config/constants.js";
import { renderAlert } from "./renderPartial.js";

/**
 * Limit failed logins per IP. Successful logins (status < 400) are not counted,
 * so only bad passwords use up the allowance.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    renderAlert(res, "danger", strings.errors.tooManyLoginAttempts, { status: 429 });
  },
});

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
