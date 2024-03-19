// sitewide javascript

$(document).ready(function () {
  /* Scroll to top */
  $(window).scroll(function () {
    var height = $(window).scrollTop();
    if (height > 100) {
      $("#scroll").fadeIn();
    } else {
      $("#scroll").fadeOut();
    }
  });

  $("#scroll").click(function (event) {
    event.preventDefault();
    $("html, body").animate({ scrollTop: 0 }, "slow");
    return false;
  });

  /* Login caps lock checks */
  loginModalCapsLock();
  loginPageCapsLock();
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
