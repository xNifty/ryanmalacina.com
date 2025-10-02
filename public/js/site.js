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

  /* Debug login modal */
  console.log('Login modal element:', document.getElementById('loginModal'));
  console.log('jQuery version:', $.fn.jquery);
  console.log('Bootstrap version:', typeof $.fn.modal);
  console.log('Bootstrap object:', typeof window.bootstrap);
  console.log('jQuery UI version:', typeof $.fn.dialog);
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

document.body.addEventListener("htmx:configRequest", (evt) => {
  const nonce = document.querySelector('meta[name="htmx-config"]')
    .getAttribute("content")
    .match(/"inlineStyleNonce":"([^"]+)"/)[1]; // extract from meta JSON
  evt.detail.headers['X-CSP-Nonce'] = nonce;
});
