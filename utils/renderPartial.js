/**
 * Render an alert partial with no layout, for HTMX targets.
 * @param {Object} res - The response object
 * @param {string} type - "success" or "danger"
 * @param {string|string[]} messages - One line or several; each is escaped
 * @param {Object} [options]
 * @param {number} [options.status] - Leave unset to keep a status set earlier (e.g. passport's 401)
 */
export function renderAlert(res, type, messages, { status } = {}) {
  if (status) res.status(status);
  return res.render("partials/alert", {
    layout: false,
    type,
    messages: [].concat(messages),
  });
}

export default { renderAlert };
