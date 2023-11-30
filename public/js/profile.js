/* Set fields required if they should be */
$(document).ready(function (event) {
  $("#profile_content").submit(function (event) {
    var newPassword = $("#pass_change_one").val();
    var confirmNewPassword = $("#pass_change_two").val();

    if (newPassword !== confirmNewPassword) {
      event.preventDefault();
    }
  });

  $("#pass_change_one, #pass_change_two")
    .on("input", validatePasswords)
    .on("input", toggleRequired);

  function validatePasswords() {
    var newPassword = $("#pass_change_one").val();
    var confirmPassword = $("#pass_change_two").val();

    if (newPassword !== confirmPassword) {
      $("#passwordMatchError").text("Passwords do not match");
    } else {
      $("#passwordMatchError").text("");
    }
  }

  function toggleRequired() {
    var newPassword = $("#pass_change_one").val();
    var confirmNewPassword = $("#pass_change_two").val();

    if (newPassword !== "" || confirmNewPassword !== "") {
      $("#pass_change_one").prop("required", true);
      $("#pass_change_two").prop("required", true);
      $("#pass_current").prop("required", true);
    } else {
      $("#pass_change_one").prop("required", false);
      $("#pass_change_two").prop("required", false);
      $("#pass_current").prop("required", false);
    }
  }
});
