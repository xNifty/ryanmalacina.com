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

  if (el !== null) {
    el.addEventListener(
      "keydown",
      (e) => {
        msg.style = e.getModifierState("CapsLock")
          ? "display: block"
          : "display: none";
      },
      { passive: true }
    );
  }
}

function loginPageCapsLock() {
  const el = document.getElementById("password");
  const msg = document.getElementById("password-message");

  if (el !== null) {
    el.addEventListener(
      "keydown",
      (e) => {
        msg.style = e.getModifierState("CapsLock")
          ? "display: block"
          : "display: none";
      },
      { passive: true }
    );
  }
}

function cb(token) {
  //console.log('token:', token);
  $("#g-recaptcha-response").val(token);
}

/* Centralized reCAPTCHA initializer (no inline scripts) */
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

/* Re-run reCAPTCHA after HTMX swaps that touch the contact form */
document.body.addEventListener('htmx:afterSwap', function(evt) {
  var elt = evt.target;
  if (elt && elt.querySelector && elt.querySelector('#contactformdiv')) {
    initializeRecaptcha();
  }
});

if ('SecurityPolicyViolationEvent' in window)
  document.addEventListener('securitypolicyviolation', (e) => {
     console.log(e.sample + '` in `' + e.violatedDirective + '`');
  } );
else console.log('SecurityPolicyViolationEvent unsupported');