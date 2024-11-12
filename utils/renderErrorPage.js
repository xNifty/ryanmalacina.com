/*
    Error Handling
    
    Catch errors and render appropriate error message and/or page.

    This is still required to render the right view with the right error message.  In the development environment
    we show the error message right on the screen so that we can fix it, while on production we just render
    the error page with the generic error message relevant to that error message.
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
