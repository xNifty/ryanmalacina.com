// Admin behaviour: toasts, editor drafts, character counts and slug suggestions.
// Loaded by views/layouts/admin.handlebars after htmx.
(function() {
  var TOAST_TIMEOUT_MS = 6000;
  var DRAFT_PREFIX = "admin-draft:";
  var DRAFT_DELAY_MS = 800;

  /* ---------- Toasts ---------- */

  function dismissToast(toast) {
    if (!toast || toast.dataset.dismissing) return;
    toast.dataset.dismissing = "true";
    toast.classList.add("toast--leaving");
    window.setTimeout(function() {
      toast.remove();
    }, 200);
  }

  // Success toasts go away on their own; errors stay until dismissed
  function scheduleToasts(root) {
    (root || document).querySelectorAll(".toast--success:not([data-scheduled])").forEach(function(toast) {
      toast.dataset.scheduled = "true";
      window.setTimeout(function() {
        dismissToast(toast);
      }, TOAST_TIMEOUT_MS);
    });
  }

  function showToast(type, message) {
    var container = document.getElementById("toasts");
    if (!container) return;
    var toast = document.createElement("div");
    toast.className = "toast toast--" + type;
    if (type === "error") toast.setAttribute("role", "alert");
    var text = document.createElement("span");
    text.className = "toast__message";
    text.textContent = message;
    var close = document.createElement("button");
    close.type = "button";
    close.className = "toast__close";
    close.setAttribute("data-toast-close", "");
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "×";
    toast.append(text, close);
    container.append(toast);
    scheduleToasts(container);
  }

  document.addEventListener("click", function(event) {
    var close = event.target.closest("[data-toast-close]");
    if (close) dismissToast(close.closest(".toast"));
  });

  document.body.addEventListener("htmx:afterSettle", function() {
    scheduleToasts();
  });

  document.body.addEventListener("htmx:responseError", function(event) {
    var status = event.detail.xhr ? event.detail.xhr.status : 0;
    showToast("error", "That didn't work (error " + status + "). Reload the page and try again.");
  });

  document.body.addEventListener("htmx:sendError", function() {
    showToast("error", "Couldn't reach the server. Check your connection and try again.");
  });

  /* ---------- Storage (may be unavailable, e.g. private windows) ---------- */

  function readDraft(key) {
    try {
      var raw = window.localStorage.getItem(DRAFT_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeDraft(key, values) {
    try {
      window.localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify({ values: values, savedAt: Date.now() }));
    } catch (e) {
      // Drafts are a convenience; ignore quota or privacy errors
    }
  }

  function clearDraft(key) {
    try {
      window.localStorage.removeItem(DRAFT_PREFIX + key);
    } catch (e) {
      // ignore
    }
  }

  /* ---------- Editor drafts ---------- */

  function formValues(form) {
    var values = {};
    Array.prototype.forEach.call(form.elements, function(el) {
      if (!el.name || el.name === "_csrf" || el.type === "file" || el.type === "submit" || el.type === "hidden") return;
      values[el.name] = el.type === "checkbox" ? el.checked : el.value;
    });
    return values;
  }

  function sameValues(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function applyValues(form, values) {
    Object.keys(values).forEach(function(name) {
      var el = form.elements.namedItem(name);
      if (!el || el.type === "file") return;
      if (el.type === "checkbox") {
        el.checked = Boolean(values[name]);
      } else {
        el.value = values[name];
      }
      // Lets htmx refresh the preview and the counters update
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function setUpDrafts(form) {
    var key = form.dataset.draftKey;
    var initial = formValues(form);
    var banner = document.querySelector("[data-draft-banner]");
    var timer = null;
    var submitting = false;

    var stored = readDraft(key);
    if (stored && stored.values && !sameValues(stored.values, initial) && banner) {
      banner.querySelector("[data-draft-time]").textContent = new Date(stored.savedAt).toLocaleString();
      banner.hidden = false;

      banner.querySelector("[data-draft-restore]").addEventListener("click", function() {
        applyValues(form, stored.values);
        banner.hidden = true;
      });
      banner.querySelector("[data-draft-discard]").addEventListener("click", function() {
        clearDraft(key);
        banner.hidden = true;
      });
    }

    function save() {
      var current = formValues(form);
      if (sameValues(current, initial)) {
        clearDraft(key);
      } else {
        writeDraft(key, current);
      }
    }

    form.addEventListener("input", function() {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, DRAFT_DELAY_MS);
    });

    form.addEventListener("submit", function() {
      submitting = true;
      window.clearTimeout(timer);
      clearDraft(key);
    });

    window.addEventListener("beforeunload", function(event) {
      if (!submitting && !sameValues(formValues(form), initial)) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
  }

  /* ---------- Character counts ---------- */

  function setUpCounter(counter) {
    var field = document.getElementById(counter.dataset.charCount);
    if (!field) return;
    var max = Number(field.getAttribute("maxlength"));

    function update() {
      var length = field.value.length;
      counter.textContent = length.toLocaleString() + (max ? " / " + max.toLocaleString() : "") + " used.";
      counter.classList.toggle("is-near-limit", max > 0 && length > max * 0.9);
    }

    field.addEventListener("input", update);
    update();
  }

  /* ---------- Slug suggestions ---------- */

  // Mirrors utils/slug.js so the placeholder shows what the server will generate
  function slugify(text) {
    return String(text || "")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/, "");
  }

  function setUpSlug(form) {
    var slug = form.querySelector("#field-slug");
    var source = form.querySelector("#field-name") || form.querySelector("#field-title");
    if (!slug || !source) return;

    var original = slug.placeholder;
    function update() {
      slug.placeholder = slugify(source.value) || original;
    }
    source.addEventListener("input", update);
    update();
  }

  /* ---------- Start ---------- */

  scheduleToasts();
  document.querySelectorAll("form[data-draft-key]").forEach(function(form) {
    setUpDrafts(form);
    setUpSlug(form);
  });
  document.querySelectorAll("[data-char-count]").forEach(setUpCounter);
})();
