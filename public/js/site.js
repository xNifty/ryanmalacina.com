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

  /* ---------- Cloudflare Turnstile for the contact form ---------- */

  // Render any widget not yet rendered. Called on load (the API script is async) and after
  // htmx swaps the form back in, e.g. to show an error, since each token works only once.
  function renderTurnstile() {
    if (!window.turnstile) return;
    document.querySelectorAll("[data-turnstile]:not([data-rendered])").forEach(function(el) {
      el.setAttribute("data-rendered", "");
      try {
        window.turnstile.render(el, {
          sitekey: el.dataset.sitekey,
          theme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
          appearance: "interaction-only",
          action: "contact",
        });
      } catch (e) {
        console.warn("Turnstile didn't render:", e);
      }
    });
  }

  window.addEventListener("load", renderTurnstile);

  /* ---------- Code highlighting (highlight.js is only loaded where needed) ---------- */

  function highlight(root) {
    if (!window.hljs) return;
    (root || document).querySelectorAll("pre code:not(.hljs)").forEach(function(block) {
      window.hljs.highlightElement(block);
    });
  }

  highlight();

  /* ---------- Home page terminal ---------- */

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setTheme(theme) {
    if (typeof window.applyTheme === "function") window.applyTheme(theme, true);
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function setUpTerminal(terminal) {
    var output = terminal.querySelector("[data-terminal-output]");
    var body = terminal.querySelector("[data-terminal-body]");
    var form = terminal.querySelector("[data-terminal-form]");
    var input = form.querySelector("input");
    var command = terminal.querySelector("[data-terminal-command]");
    var reveal = Array.prototype.slice.call(terminal.querySelectorAll("[data-terminal-reveal]"));
    var pages = (terminal.dataset.pages || "").split(" ").filter(Boolean);
    var history = [];
    var historyIndex = 0;

    var places = { "~": "/", home: "/", projects: "/projects", news: "/news", contact: "/#contact" };
    pages.forEach(function(page) {
      places[page] = "/" + page;
    });

    function print(text, className) {
      var line = document.createElement("p");
      line.className = "terminal__line" + (className ? " " + className : "");
      line.textContent = text;
      output.append(line);
      return line;
    }

    function echo(text) {
      var line = print("", "terminal__line--command");
      var prompt = document.createElement("span");
      prompt.className = "terminal__prompt";
      prompt.setAttribute("aria-hidden", "true");
      prompt.textContent = "$";
      line.append(prompt, " " + text);
    }

    function go(path) {
      print("opening " + path + " …", "terminal__line--muted");
      window.setTimeout(function() {
        window.location.href = path;
      }, reducedMotion ? 0 : 250);
    }

    function listing() {
      var files = ["projects/", "news/"].concat(
        pages.map(function(page) {
          return page + ".md";
        })
      );
      return files.join("  ");
    }

    var commands = {
      help: function() {
        print("commands:");
        print("  ls               list what's here");
        print("  cd <place>       go somewhere: " + Object.keys(places).join(", "));
        print("  cat <page>.md    read a page");
        print("  whoami           who's this?");
        print("  theme [light|dark]");
        print("  github           my GitHub profile");
        print("  clear            clear the screen");
      },
      ls: function() {
        print(listing(), "terminal__line--dir");
      },
      cd: function(args) {
        var place = (args[0] || "~").replace(/\/$/, "").replace(/\.md$/, "");
        if (places[place]) return go(places[place]);
        print("cd: " + args[0] + ": No such file or directory", "terminal__line--error");
      },
      cat: function(args) {
        var name = (args[0] || "").replace(/\.md$/, "");
        if (!name) return print("cat: missing file name. Try: cat about.md", "terminal__line--error");
        if (pages.indexOf(name) !== -1) return go("/" + name);
        print("cat: " + args[0] + ": No such file or directory", "terminal__line--error");
      },
      whoami: function() {
        print("ryan: software developer. For the longer version, try cat about.md");
      },
      theme: function(args) {
        var next = args[0] === "light" || args[0] === "dark" ? args[0] : currentTheme() === "dark" ? "light" : "dark";
        setTheme(next);
        print("theme set to " + next);
      },
      github: function() {
        go("https://github.com/xNifty");
      },
      clear: function() {
        output.replaceChildren();
      },
      pwd: function() {
        print("/home/ryan");
      },
      date: function() {
        print(new Date().toString());
      },
      echo: function(args) {
        print(args.join(" "));
      },
      sudo: function() {
        print("ryan is not in the sudoers file. This incident will be reported.", "terminal__line--error");
      },
      exit: function() {
        print("There is no escape. Try cd projects instead.");
      },
    };
    commands.open = commands.cd;
    commands.dir = commands.ls;
    commands["?"] = commands.help;

    function run(line) {
      var parts = line.trim().split(/\s+/);
      var name = parts[0].toLowerCase();
      var args = parts.slice(1);
      if (!name) return;
      // "projects" on its own works like "cd projects"
      if (!commands[name] && places[name.replace(/\/$/, "")]) return go(places[name.replace(/\/$/, "")]);
      if (commands[name]) return commands[name](args);
      print(name + ": command not found. Type help to see what works.", "terminal__line--error");
    }

    form.addEventListener("submit", function(event) {
      event.preventDefault();
      var line = input.value;
      input.value = "";
      echo(line);
      if (line.trim()) {
        history.push(line);
        historyIndex = history.length;
        run(line);
      }
      body.scrollTop = body.scrollHeight;
    });

    input.addEventListener("keydown", function(event) {
      if (event.key === "ArrowUp" && historyIndex > 0) {
        historyIndex -= 1;
        input.value = history[historyIndex];
        event.preventDefault();
      } else if (event.key === "ArrowDown" && historyIndex < history.length) {
        historyIndex += 1;
        input.value = history[historyIndex] || "";
        event.preventDefault();
      }
    });

    // Clicking anywhere in the window focuses the prompt, unless text is being selected
    body.addEventListener("click", function() {
      if (!form.hidden && !String(window.getSelection())) input.focus();
    });

    function ready() {
      form.hidden = false;
      terminal.classList.add("is-ready");
    }

    if (reducedMotion) return ready();

    // Type the command out, then show its output a line at a time
    var text = command.textContent;
    command.textContent = "";
    reveal.forEach(function(line) {
      line.hidden = true;
    });
    terminal.classList.add("is-typing");

    var i = 0;
    var typer = window.setInterval(function() {
      i += 1;
      command.textContent = text.slice(0, i);
      if (i < text.length) return;
      window.clearInterval(typer);
      terminal.classList.remove("is-typing");
      reveal.forEach(function(line, index) {
        window.setTimeout(function() {
          line.hidden = false;
          if (index === reveal.length - 1) ready();
        }, 220 + index * 140);
      });
      if (reveal.length === 0) ready();
    }, 55);
  }

  document.querySelectorAll("[data-terminal]").forEach(setUpTerminal);

  /* ---------- Keyboard shortcuts ("?" lists them) ---------- */

  var shortcuts = document.getElementById("shortcuts");
  var GO_TO = { h: "/", p: "/projects", n: "/news", a: "/about", w: "/now", u: "/uses", c: "/#contact" };
  var pendingG = false;
  var pendingTimer = null;

  function isTyping(target) {
    return target.closest && target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']");
  }

  document.addEventListener("keydown", function(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
    if (shortcuts && shortcuts.open) return;

    if (pendingG) {
      pendingG = false;
      window.clearTimeout(pendingTimer);
      var path = GO_TO[event.key];
      // Only go to pages that are linked from this one (now and uses may be unpublished)
      if (path && (path.charAt(1) === "#" || path === "/" || document.querySelector('a[href="' + path + '"]'))) {
        event.preventDefault();
        window.location.href = path;
      }
      return;
    }

    switch (event.key) {
      case "g":
        pendingG = true;
        pendingTimer = window.setTimeout(function() {
          pendingG = false;
        }, 1200);
        break;
      case "?":
        if (shortcuts && typeof shortcuts.showModal === "function") {
          event.preventDefault();
          shortcuts.showModal();
        }
        break;
      case "t":
        setTheme(currentTheme() === "dark" ? "light" : "dark");
        break;
      case "/":
        var target = document.getElementById("news-q") || document.getElementById("terminal-input");
        if (target && !target.closest("[hidden]")) {
          event.preventDefault();
          target.focus();
        }
        break;
    }
  });

  // Close the shortcuts dialog by clicking the backdrop
  if (shortcuts) {
    shortcuts.addEventListener("click", function(event) {
      if (event.target === shortcuts) shortcuts.close();
    });
  }

  /* ---------- Page transitions: a project card's icon and name morph into the page header ---------- */

  document.addEventListener("click", function(event) {
    var link = event.target.closest(".project-card__name a");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    // Names must be unique on the page, so clear any left from an earlier click (back button)
    document.querySelectorAll(".project-card [data-vt]").forEach(function(el) {
      el.style.viewTransitionName = "";
    });
    var card = link.closest(".project-card");
    var icon = card.querySelector(".project-card__image, .monogram");
    // style properties via CSSOM; the CSP blocks style attributes, not this
    if (icon) {
      icon.dataset.vt = "";
      icon.style.viewTransitionName = "project-icon";
    }
    link.dataset.vt = "";
    link.style.viewTransitionName = "project-title";
  });

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
    renderTurnstile();
  });

  // Send this page's CSP nonce, so any scripts in swapped-in HTML carry a nonce the page allows
  document.body.addEventListener("htmx:configRequest", function(event) {
    var meta = document.querySelector('meta[name="htmx-config"]');
    var match = meta && meta.getAttribute("content").match(/"inlineScriptNonce":"([^"]+)"/);
    if (match) event.detail.headers["X-CSP-Nonce"] = match[1];
  });
})();
