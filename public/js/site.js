// sitewide javascript

function openCspModal(modalId) {
  var modal = document.getElementById(modalId);
  if (!modal) {
    return;
  }
  modal.classList.add("is-visible");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeCspModal(modal) {
  if (typeof modal === "string") {
    modal = document.getElementById(modal);
  }
  if (!modal) {
    return;
  }
  modal.classList.remove("is-visible");
  modal.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".csp-modal.is-visible")) {
    document.body.classList.remove("modal-open");
  }
}

function syncModalBodyClass() {
  if (document.querySelector(".csp-modal.is-visible")) {
    document.body.classList.add("modal-open");
  }
}

$(document).ready(function() {
  if ($.support) {
    $.support.transition = false;
  }

  document.body.classList.add("is-scroll-enabled");

  /* Scroll to top */
  $(window).scroll(function() {
    var scrollButton = document.getElementById("scroll");
    if (!scrollButton) {
      return;
    }
    if ($(window).scrollTop() > 100) {
      scrollButton.classList.add("is-visible");
    } else {
      scrollButton.classList.remove("is-visible");
    }
  });

  $("#scroll").click(function(event) {
    event.preventDefault();
    $("html, body").animate({ scrollTop: 0 }, "slow");
    return false;
  });

  /* Login caps lock checks */
  loginModalCapsLock();
  loginPageCapsLock();

  /* Initialize reCAPTCHA on load */
  initializeRecaptcha();
});

document.body.addEventListener("click", function(event) {
  var openTrigger = event.target.closest("[data-csp-modal-open]");
  if (openTrigger) {
    event.preventDefault();
    openCspModal(openTrigger.getAttribute("data-csp-modal-open"));
    return;
  }

  var dismissTrigger = event.target.closest("[data-csp-modal-dismiss]");
  if (dismissTrigger) {
    event.preventDefault();
    closeCspModal(dismissTrigger.closest(".csp-modal"));
    return;
  }

  var modal = event.target.closest(".csp-modal.is-visible");
  if (modal && event.target === modal) {
    closeCspModal(modal);
  }
});

function loginModalCapsLock() {
  const el = document.getElementById("sp_pass");
  const msg = document.getElementById("sp_pass_message");

  if (!el) return;

  el.addEventListener("keydown", (e) => {
    if (e.getModifierState("CapsLock")) {
      msg.classList.remove("capslock-hidden");
      msg.classList.add("capslock-visible");
    } else {
      msg.classList.remove("capslock-visible");
      msg.classList.add("capslock-hidden");
    }
  }, { passive: true });
}

function loginPageCapsLock() {
  const el = document.getElementById("password");
  const msg = document.getElementById("password-message");

  if (!el) return;

  el.addEventListener("keydown", (e) => {
    if (e.getModifierState("CapsLock")) {
      msg.classList.remove("capslock-hidden");
      msg.classList.add("capslock-visible");
    } else {
      msg.classList.remove("capslock-visible");
      msg.classList.add("capslock-hidden");
    }
  }, { passive: true });
}


function cb(token) {
  //console.log('token:', token);
  $("#g-recaptcha-response").val(token);
}

function initializeRecaptcha() {
  if (typeof grecaptcha === 'undefined' || !document.getElementById('g-recaptcha-response')) {
    return;
  }
  try {
    grecaptcha.ready(function() {
      grecaptcha.execute('6LeCKqYUAAAAAAh4n_WgK7e-fKbqOgrukjjBmqBG', { action: 'homepage' }).then(cb);
    });
  } catch (e) {
    console.warn('reCAPTCHA init skipped:', e);
  }
}

document.body.addEventListener('htmx:afterSwap', function(evt) {
  var elt = evt.target;
  syncModalBodyClass();
  if (elt && elt.querySelector && elt.querySelector('#contactformdiv')) {
    initializeRecaptcha();
  }
});

document.body.addEventListener("htmx:configRequest", (evt) => {
  const nonce = document.querySelector('meta[name="htmx-config"]')
    .getAttribute("content")
    .match(/"inlineStyleNonce":"([^"]+)"/)[1]; // extract from meta JSON
  evt.detail.headers['X-CSP-Nonce'] = nonce;
});
