/*
  Shared response helpers for the admin routes.
*/

/**
 * Status filter tabs for the admin lists.
 * @param {Array<{key: string, label: string}>} tabs - key "" means everything
 * @param {string} current - The requested status
 * @returns {{ status: string, tabs: Object[] }} - The status to filter by and tabs with active flags
 */
export function statusTabs(tabs, current) {
  const status = tabs.some((tab) => tab.key === current) ? current : "";
  return {
    status,
    tabs: tabs.map((tab) => ({ ...tab, active: tab.key === status })),
  };
}

/**
 * Respond to an HTMX row action: the row partial (or nothing, which removes the row) plus an
 * optional toast swapped into #toasts out of band.
 * @param {Object} res
 * @param {Object} options
 * @param {string} [options.row] - Partial name, e.g. "admin/project-row"
 * @param {Object} [options.item] - The row's data
 * @param {Object} [options.toast] - { type: "success" | "error", message }
 * @param {number} [options.status]
 */
export function renderRowAction(res, { row, item, toast, status = 200 }) {
  return res.status(status).render("partials/admin/row-response", {
    layout: false,
    rowPartial: row,
    item,
    toast,
  });
}

/**
 * Turn a unique-index violation into a message for the offending field.
 * @param {Error} ex
 * @param {Object<string, string>} messages - field -> message, e.g. { slug: "..." }
 * @returns {Object|null} - { field: message }, or null if it isn't a duplicate-key error
 */
export function duplicateFieldError(ex, messages) {
  if (ex?.code !== 11000) return null;
  const field = Object.keys(ex.keyPattern ?? {}).find((key) => key in messages);
  return field ? { [field]: messages[field] } : { form: "That conflicts with an existing entry." };
}

export default { statusTabs, renderRowAction, duplicateFieldError };
