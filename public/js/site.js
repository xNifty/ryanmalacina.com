// Public site behaviour. Plain JavaScript; loaded at the end of the body after htmx.
(function() {
  /* ---------- Mobile menu ---------- */

  var toggle = document.querySelector("[data-menu-toggle]");
  var nav = document.getElementById("site-nav");

  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function() {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function(event) {
      if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  /* ---------- Flash messages ---------- */

  document.addEventListener("click", function(event) {
    var close = event.target.closest("[data-flash-close]");
    if (close) {
      var flash = close.closest(".flash");
      if (flash) flash.remove();
    }
  });

  /* ---------- News search: "Clear search" also empties the box ---------- */

  document.addEventListener("click", function(event) {
    if (!event.target.closest("[data-clear-search]")) return;
    var box = document.getElementById("news-q");
    if (box) box.value = "";
  });

  /* ---------- Caps Lock warnings: <input data-caps-warning="id-of-message"> ---------- */

  document.addEventListener("keydown", function(event) {
    var input = event.target.closest && event.target.closest("[data-caps-warning]");
    if (!input || typeof event.getModifierState !== "function") return;
    var warning = document.getElementById(input.getAttribute("data-caps-warning"));
    if (warning) warning.hidden = !event.getModifierState("CapsLock");
  });

  /* ---------- reCAPTCHA v3 for the contact form ---------- */

  function recaptchaSiteKey() {
    var meta = document.querySelector('meta[name="recaptcha-site-key"]');
    return meta ? meta.content : "";
  }

  function initializeRecaptcha() {
    var field = document.getElementById("g-recaptcha-response");
    if (!field || typeof window.grecaptcha === "undefined") return;
    try {
      window.grecaptcha.ready(function() {
        window.grecaptcha.execute(recaptchaSiteKey(), { action: "homepage" }).then(function(token) {
          field.value = token;
        });
      });
    } catch (e) {
      console.warn("reCAPTCHA init skipped:", e);
    }
  }

  // The reCAPTCHA script loads with the contact form, possibly after this file runs
  window.addEventListener("load", initializeRecaptcha);

  /* ---------- Code highlighting (highlight.js is only loaded where needed) ---------- */

  function highlight(root) {
    if (!window.hljs) return;
    (root || document).querySelectorAll("pre code:not(.hljs)").forEach(function(block) {
      window.hljs.highlightElement(block);
    });
  }

  highlight();

  /* ---------- htmx ---------- */

  // Say so when a search or page change fails, instead of silently doing nothing
  function showRequestError(event, message) {
    var target = event.detail.target;
    if (!target || target.id !== "news-results") return;
    var notice = document.createElement("p");
    notice.className = "empty";
    notice.setAttribute("role", "alert");
    notice.textContent = message;
    target.replaceChildren(notice);
  }

  document.body.addEventListener("htmx:responseError", function(event) {
    showRequestError(event, "Search isn't working right now. Please try again in a moment.");
  });

  document.body.addEventListener("htmx:sendError", function(event) {
    showRequestError(event, "Couldn't reach the site. Check your connection and try again.");
  });

  document.body.addEventListener("htmx:afterSwap", function(event) {
    var target = event.detail.target;
    highlight(target);
    if (target && target.querySelector && target.querySelector("#g-recaptcha-response")) {
      initializeRecaptcha();
    }
  });

  // Send this page's CSP nonce, so scripts in swapped-in HTML (the contact form's reCAPTCHA
  // loader) carry a nonce the page allows
  document.body.addEventListener("htmx:configRequest", function(event) {
    var meta = document.querySelector('meta[name="htmx-config"]');
    var match = meta && meta.getAttribute("content").match(/"inlineScriptNonce":"([^"]+)"/);
    if (match) event.detail.headers["X-CSP-Nonce"] = match[1];
  });
})();
