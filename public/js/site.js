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

// Select all links with hashes
$('a[href*="#"]')
  // Remove links that don't actually link to anything
  .not('[href="#"]')
  .not('[href="#0"]')
  .click(function (event) {
    // On-page links
    if (
      location.pathname.replace(/^\//, "") ===
        this.pathname.replace(/^\//, "") &&
      location.hostname === this.hostname
    ) {
      // Figure out element to scroll to
      let target = $(this.hash);
      target = target.length ? target : $("[name=" + this.hash.slice(1) + "]");
      // Does a scroll target exist?
      if (target.length) {
        // Only prevent default if animation is actually gonna happen
        event.preventDefault();
        $("html, body").animate(
          {
            scrollTop: target.offset().top,
          },
          1000,
          function () {
            // Callback after animation
            // Must change focus!
            let $target = $(target);
            //$target.focus();
            if ($target.is(":focus")) {
              // Checking if the target was focused
              return false;
            } else {
              $target.attr("tabindex", "-1"); // Adding tabindex for elements not focusable
              //$target.focus(); // Set focus again
            }
          }
        );
      }
    }
  });

function cb(token) {
  //console.log('token:', token);
  $("#g-recaptcha-response").val(token);
}
