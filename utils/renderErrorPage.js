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
  if (status === 404) {
    res.render("error", {
      error:
        env === "development"
          ? err.stack.replace(/\n/g, "<br />")
          : strings.errors.pageNotFound,
      status_code: status[404],
      title: strings.pageHeader.error,
    });
  } else if (status === 500) {
    res.render("error", {
      error:
        env === "development"
          ? err.stack.replace(/\n/g, "<br />")
          : strings.errors.serverError,
      status_code: status[500],
      title: strings.pageHeader.error,
    });
  } else if (status === 401) {
    res.render("error", {
      error: strings.errors.notAuthorized,
      status_code: status[401],
      title: strings.pageHeader.error,
    });
  } else {
    res.render("error", {
      error:
        env === "development"
          ? err.stack.replace(/\n/g, "<br />")
          : strings.errors.serverError,
      status_code: status[500],
      title: strings.pageHeader.error,
    });
  }
}
