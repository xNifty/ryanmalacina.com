(function() {
  const SPLASH_COOKIE = "siteSplashSeen";
  const LEGACY_SPLASH_COOKIE = "welcomeShown";
  const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10;
  const DISPLAY_DURATION_MS = 2500;
  const TRANSITION_DURATION_MS = 400;

  function getCookie(name) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(new RegExp("(?:^|; )" + escapedName + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setSplashSeenCookie() {
    document.cookie =
      SPLASH_COOKIE +
      "=true; max-age=" +
      COOKIE_MAX_AGE_SECONDS +
      "; path=/; SameSite=Lax";
  }

  function hasSeenSplash() {
    return getCookie(SPLASH_COOKIE) === "true" || getCookie(LEGACY_SPLASH_COOKIE) === "true";
  }

  function dismissSplash(splash) {
    if (!splash || splash.dataset.dismissed === "true") {
      return;
    }

    splash.dataset.dismissed = "true";
    splash.classList.remove("site-splash--active");
    splash.classList.add("site-splash--hiding");

    window.setTimeout(function() {
      splash.hidden = true;
      splash.remove();
    }, TRANSITION_DURATION_MS);
  }

  function showSplash() {
    const splash = document.getElementById("siteSplash");

    if (!splash) {
      return;
    }

    if (hasSeenSplash()) {
      splash.remove();
      return;
    }

    setSplashSeenCookie();
    splash.hidden = false;

    window.requestAnimationFrame(function() {
      splash.classList.add("site-splash--active");
    });

    const dismissButton = splash.querySelector("[data-splash-dismiss]");
    if (dismissButton) {
      dismissButton.addEventListener("click", function() {
        dismissSplash(splash);
      });
    }

    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape") {
        dismissSplash(splash);
      }
    });

    window.setTimeout(function() {
      dismissSplash(splash);
    }, DISPLAY_DURATION_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showSplash);
  } else {
    showSplash();
  }
})();
