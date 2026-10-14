/*
    A simple error handling file. Does exactly what you would expect it to do:
    Catch errors and render appropriate error message and/or page.

    Depending on the environment, we either show a generic message or more detailed breakdown
    of the error that occurred. Mostly, this is just so that on development environements we can
    actually see the error whereas production should just get a generic message defined from within
    the constants.js file where we define all the constant strings.

    /config/constants.js
*/
import { strings } from "../config/constants.js";

export default function renderErrorPage(env, status, err, req, res) {
  const showStack = env === "development" && err?.stack;
  let message;

  if (status === 404) {
    message = strings.errors.pageNotFound;
  } else if (status === 401) {
    message = strings.errors.notAuthorized;
  } else {
    // Keep other client errors (e.g. 403 from a bad CSRF token) as-is; anything else is a 500
    if (!(status >= 400 && status < 500)) status = 500;
    message = strings.errors.serverError;
  }

  res.status(status).render("error", {
    error:
      showStack && status !== 401
        ? err.stack.replace(/\n/g, "<br />")
        : message,
    status_code: strings.status[status] ?? String(status),
    title: strings.pageHeader.error,
  });
}
