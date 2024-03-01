// admin pages javascript
$(document).ready(function () {
  $(".confirmModal").on("click", function (e) {
    var id = $(this).data("id");
    $("#confirm-id").val(id);
  });

  $("#modalSubmit").on("click", function () {
    deleteProject();
  });
});

function deleteProject() {
  var deleteID = $("#confirm-id").val();
  var csrfToken = $("#confirm-csrf").val();
  $.ajax({
    type: "PUT",
    headers: {
      "X-CSRF-TOKEN": csrfToken,
    },
    url: "/projects/delete/" + deleteID,
    datatype: "json",
    success: function () {
      window.location.reload();
    },
    fail: function () {
      alert("There was an issue deleting.  Check the error log.");
    },
  });

  return false;
}

//limit 3 checkboxes on projects page
$(document).ready(function () {
  var count = $("input[type=checkbox]:checked").length;
  if (count < 3) {
    // we only want to allow 3 to be checked here.
    $("input[type=checkbox]").removeAttr("disabled");
    // re-enable all checkboxes
  } else {
    $("input[type=checkbox]").prop("disabled", "disabled");
    // disable all checkboxes
    $("input[type=checkbox]:checked").removeAttr("disabled");
    // only enable the elements that are already checked.
  }
});
