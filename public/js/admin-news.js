// admin pages javascript
$(document).ready(function () {
  $(".publishNews").on("click", publishNews);
  $(".unpublishNews").on("click", unpublishNews);
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

function closeModal() {
  document.querySelector("#confirmModal").classList.remove("show");
  document.body.classList.remove("modal-open");
  document.querySelector(".modal-backdrop").remove();
}
