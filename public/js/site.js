// sitewide javascript

$(document).ready(function() {
  /* Scroll to top */
  $(window).scroll(function() {
    var height = $(window).scrollTop();
    if (height > 100) {
      $("#scroll").fadeIn();
    } else {
      $("#scroll").fadeOut();
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

  /* Ensure scrolling is enabled after login and dynamic actions */
  document.body.style.overflow = "auto";
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