(function() {
  const THEME_COOKIE = "theme";

  function getCookie(name) {
    const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function getStoredTheme() {
    const cookieTheme = getCookie(THEME_COOKIE);
    if (cookieTheme === "light" || cookieTheme === "dark") {
      return cookieTheme;
    }
    return getSystemTheme();
  }

  function applyHljsTheme(theme) {
    const lightLink = document.getElementById("hljs-light");
    const darkLink = document.getElementById("hljs-dark");
    if (!lightLink || !darkLink) {
      return;
    }
    if (theme === "dark") {
      lightLink.media = "not all";
      darkLink.media = "all";
    } else {
      lightLink.media = "all";
      darkLink.media = "not all";
    }
  }

  function updateToggleIcon(theme) {
    const toggles = document.querySelectorAll(".theme-toggle");
    toggles.forEach(function(toggle) {
      const icon = toggle.querySelector("i");
      if (!icon) {
        return;
      }
      if (theme === "dark") {
        icon.className = "fa fa-sun-o";
        toggle.setAttribute("title", "Switch to light mode");
        toggle.setAttribute("aria-label", "Switch to light mode");
      } else {
        icon.className = "fa fa-moon-o";
        toggle.setAttribute("title", "Switch to dark mode");
        toggle.setAttribute("aria-label", "Switch to dark mode");
      }
    });
  }

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute("data-theme", theme);
    applyHljsTheme(theme);
    updateToggleIcon(theme);

    if (persist) {
      document.cookie = THEME_COOKIE + "=" + theme + "; max-age=31536000; path=/; SameSite=Lax";
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || getStoredTheme();
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next, true);
  }

  function syncTheme() {
    const theme = getStoredTheme();
    applyTheme(theme, false);
  }

  window.getStoredTheme = getStoredTheme;
  window.applyTheme = applyTheme;
  window.toggleTheme = toggleTheme;

  if (!document.documentElement.dataset.themeToggleBound) {
    document.documentElement.dataset.themeToggleBound = "true";

    document.addEventListener("click", function(event) {
      const toggle = event.target.closest(".theme-toggle");
      if (!toggle) {
        return;
      }
      event.preventDefault();
      toggleTheme();
    });

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function() {
      if (!getCookie(THEME_COOKIE)) {
        applyTheme(getSystemTheme(), false);
      }
    });

    document.addEventListener("htmx:afterSettle", syncTheme);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncTheme);
  } else {
    syncTheme();
  }
})();
