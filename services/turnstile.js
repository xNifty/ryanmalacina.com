/*
  Cloudflare Turnstile, the spam check on the contact form.

  The widget (views/partials/contact-form.handlebars, rendered by public/js/site.js) adds a
  cf-turnstile-response field to the form; verify() asks Cloudflare whether that token is
  genuine. Tokens are single-use and expire after five minutes.

  Keys: turnstileSiteKey in config (public), turnstileSecretKey in .env. Cloudflare's test
  keys work for local development: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
*/
import config from "config";

import logErrorToFile from "../utils/errorLogging.js";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;

export const TOKEN_FIELD = "cf-turnstile-response";

export function siteKey() {
  return config.has("turnstileSiteKey") ? String(config.get("turnstileSiteKey")) : "";
}

/**
 * @param {string} token - The form's cf-turnstile-response value
 * @param {string} [remoteIp] - The visitor's address, which Cloudflare uses as an extra signal
 * @returns {Promise<{ success: boolean, error?: string }>} - error is safe to show the visitor
 */
export async function verify(token, remoteIp) {
  const secret = process.env.turnstileSecretKey;
  if (!secret) {
    logErrorToFile(new Error("turnstileSecretKey isn't set, so the contact form can't be checked"));
    return { success: false, error: "The contact form isn't working right now. Please try again later." };
  }

  if (typeof token !== "string" || token === "") {
    return {
      success: false,
      error: "The spam check didn't finish. Wait a moment, then send your message again.",
    };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(VERIFY_URL, { method: "POST", body, signal: controller.signal });
    const outcome = await response.json();
    if (outcome.success) return { success: true };

    const codes = outcome["error-codes"] ?? [];
    // Problems on our side (bad secret, malformed request) need fixing, not retrying
    if (codes.some((code) => code.startsWith("missing-input-secret") || code.startsWith("invalid-input-secret"))) {
      logErrorToFile(new Error(`Turnstile rejected the secret key: ${codes.join(", ")}`));
    }
    return {
      success: false,
      error: codes.includes("timeout-or-duplicate")
        ? "The spam check expired. Send your message again."
        : "Your message didn't pass the spam check. Please try again.",
    };
  } catch (err) {
    logErrorToFile(err);
    return { success: false, error: "Couldn't run the spam check. Please try again in a moment." };
  } finally {
    clearTimeout(timer);
  }
}

export default { siteKey, verify, TOKEN_FIELD };
