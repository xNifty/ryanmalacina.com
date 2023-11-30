/* Set fields required if they should be */
$(document).ready(function (event) {
  $("#profileUpdate").click(function () {
    var newPassword = $("#pass_change_one").val();
    var confirmNewPassword = $("#pass_change_two").val();
    var currentPassword = $("#pass_current").val();

    if (newPassword !== "" || confirmNewPassword !== "") {
      $("#pass_change_one").prop("required", true);
      $("#pass_change_two").prop("required", true);
      $("#pass_current").prop("required", true);
      event.preventDefault();
    } else {
      $("#pass_change_one").prop("required", false);
      $("#pass_change_two").prop("required", false);
      $("#pass_current").prop("required", false);
    }
  });
});
