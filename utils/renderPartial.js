/**
 * Render an alert partial with no layout, for HTMX targets.
 * @param {Object} res - The response object
 * @param {string} type - "success" or "danger"
 * @param {string|string[]} messages - One line or several; each is escaped
 * @param {Object} [options]
 * @param {number} [options.status] - Leave unset to keep a status set earlier (e.g. passport's 401)
 * @param {string} [options.view] - "partials/alert" (default) or "partials/modal-alert"
 */
export function renderAlert(res, type, messages, { status, view = "partials/alert" } = {}) {
  if (status) res.status(status);
  return res.render(view, {
    layout: false,
    type,
    messages: [].concat(messages),
  });
}

export default { renderAlert };
