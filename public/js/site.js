// sitewide javascript

$(document).ready(function () {
  // $("#loginFormModal").on("click", login);

  /* Scroll to top */
  $(window).scroll(function () {
    var height = $(window).scrollTop();
    if (height > 100) {
      $("#scroll").fadeIn();
    } else {
      $("#scroll").fadeOut();
    }
  });
  $(document).ready(function () {
    $("#scroll").click(function (event) {
      event.preventDefault();
      $("html, body").animate({ scrollTop: 0 }, "slow");
      return false;
    });
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

// function login() {
//   var form = document.getElementById("loginFormModal");
//   var csrfToken = form.querySelector('[name="modal_csrf"]').value;
//   form.onsubmit = function (e) {
//     e.preventDefault();
//     var user = form.username.value;
//     var pass = form.password.value;
//     $.ajax({
//       type: "POST",
//       headers: {
//         "X-CSRF-TOKEN": csrfToken,
//       },
//       url: "/login/modal",
//       data: {
//         username: user,
//         password: pass,
//       },
//       datatype: "json",
//       success: function () {
//         $("#loginSubmit").hide();
//         $("#loginStatus").html(
//           '<div class="modalAlert alert alert-success alert-dismissible center-block text-center">You have been successfully logged in!</div>'
//         );
//         $("#sp_uname").prop("disabled", true);
//         $("#sp_pass").prop("disabled", true);
//         setTimeout(location.reload.bind(location), 3000);
//       },
//       error: function () {
//         $("#loginStatus").html(
//           '<div class="modalAlert alert alert-danger alert-dismissible center-block text-center">Invalid username or password!</div>'
//         );
//         $("#loginModal").effect("shake");
//       },
//       always: function () {
//         location.reload();
//       },
//     });
//   };
// }

function logout() {
  $.ajax({
    type: "post",
    url: "/logout",
    datatype: "json",
    success: function () {
      location.reload();
    },
    fail: function () {
      alert(
        "There was an issue logging out, please report this if it continues."
      );
    },
  });

  return false;
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
