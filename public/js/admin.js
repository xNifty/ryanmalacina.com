// admin pages javascript
$(document).ready(function () {
  $(".publish").on("click", publishProject);
  $(".unpublish").on("click", unpublishProject);
  // $('.deleteProject').on('click', deleteProject);
  $(".projCheckbox").on("click", updateCheckbox);

  $(".confirmModal").on("click", function (e) {
    var id = $(this).data("id");
    $("#confirm-id").val(id);
  });

  $("#modalSubmit").on("click", function () {
    deleteProject();
  });
});

function publishProject() {
  $.ajax({
    type: "PUT",
    url: "/admin/projects/publish/" + $(this).data("id"),
    datatype: "json",
    success: function () {
      window.location.reload();
    },
    fail: function () {
      alert("There was an issue publishing.  Check the error log.");
    },
  });

  return false;
}

function unpublishProject() {
  $.ajax({
    type: "PUT",
    url: "/admin/projects/unpublish/" + $(this).data("id"),
    datatype: "json",
    success: function () {
      window.location.reload();
    },
    fail: function () {
      alert("There was an issue unpublishing.");
    },
  });

  return false;
}

function deleteProject() {
  var deleteID = $("#confirm-id").val();
  $.ajax({
    type: "PUT",
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

function updateCheckbox() {
  $(this).prop("disabled", "disabled");
  $.ajax({
    type: "put",
    url: "/projects/update/" + $(this).data("id"),
    data: "json",
    success: function () {
      $(this).removeAttr("disabled");
      window.location.href = window.location.href;
    },
    fail: function () {
      window.location.href = window.location.href;
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
    $("input[type=checkbox]").change(updateCheckbox);
    // re-enable all checkboxes
  } else {
    $("input[type=checkbox]").prop("disabled", "disabled");
    // disable all checkboxes
    $("input[type=checkbox]:checked").removeAttr("disabled");
    // only enable the elements that are already checked.
  }
});
