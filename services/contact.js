/*
  The home page contact form: checking what the visitor typed, and emailing it on. The spam
  check is services/turnstile.js; the route (routes/home.js) runs it after these field checks.
*/
import { sendContactMessage } from "../utils/sendMail.js";

// Simple shape check; the reply goes to this address, so it only needs to look deliverable
const EMAIL_PATTERN = /^[^\s@<>()[\]\,;:"]+@[^\s@<>()[\]\,;:"]+\.[a-zA-Z]{2,}$/;

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// For values that end up in email headers (subject, Reply-To)
function singleLine(value) {
  return asText(value).replace(/[\r\n]+/g, " ");
}

/**
 * @param {Object} body - The submitted form
 * @returns {{ values: Object, errors: string[], invalid: Object }} - values is the cleaned form,
 *   errors the messages to show (empty when it's fine), invalid the fields to highlight
 */
export function validateContactForm(body = {}) {
  const values = {
    name: singleLine(body.name),
    email: singleLine(body.email),
    subject: singleLine(body.subject),
    message: asText(body.message),
  };

  const errors = [];
  const invalid = {};

  if (!values.name) {
    errors.push("Name is a required field.");
    invalid.name = true;
  }
  if (!values.email) {
    errors.push("Email is a required field.");
    invalid.email = true;
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.push("Please provide a valid email.");
    invalid.email = true;
  }
  if (!values.subject) {
    errors.push("Subject is a required field.");
    invalid.subject = true;
  }
  if (!values.message) {
    errors.push("Message is a required field.");
    invalid.message = true;
  }

  return { values, errors, invalid };
}

/**
 * @param {Object} values - The cleaned form from validateContactForm
 * @returns {Promise<boolean>} - Whether the email went out
 */
export function sendContactForm({ name, email, subject, message }) {
  return sendContactMessage(
    email,
    `Email received on behalf of ${name}: ${subject}`,
    `Contact form email on behalf of: ${name} <${email}>\n\n----\n\n${message}`
  );
}

export default { validateContactForm, sendContactForm };
