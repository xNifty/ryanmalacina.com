// admin pages javascript
$(document).ready(function () {
  $(".publishNews").on("click", publishNews);
  $(".unpublishNews").on("click", unpublishNews);

  $(".confirmModal").on("click", function (e) {
    var id = $(this).data("id");
    $("#confirm-id").val(id);
  });

  $("#modalSubmit").on("click", function () {
    deleteNews();
  });
});

function publishNews() {
  var csrfToken = document.getElementById("_csrf").value;
  $.ajax({
    type: "PUT",
    headers: {
      "X-CSRF-TOKEN": csrfToken,
    },
    url: "/admin/news/publish/" + $(this).data("id"),
    datatype: "json",
    success: function () {
      window.location.reload();
    },
    fail: function () {
      alert("There was an issue publishing.");
    },
  });

  return false;
}

function unpublishNews() {
  var csrfToken = document.getElementById("_csrf").value;
  alert(csrfToken);
  $.ajax({
    type: "PUT",
    headers: {
      "X-CSRF-TOKEN": csrfToken,
    },
    url: "/admin/news/unpublish/" + $(this).data("id"),
    datatype: "json",
    success: function () {
      window.location.reload();
    },
    fail: function () {
      alert("There was an issue unpublishing.  Check the error log.");
    },
  });

  return false;
}

function deleteNews() {
  var deleteID = $("#confirm-id").val();
  var csrfToken = $("#confirm-csrf").val();
  $.ajax({
    type: "PUT",
    headers: {
      "X-CSRF-TOKEN": csrfToken,
    },
    url: "/admin/news/delete/" + deleteID,
    datatype: "json",
    success: function () {
      window.location.reload();
    },
    fail: function () {
      alert("There was an issue deleting.");
    },
  });

  return true;
}
