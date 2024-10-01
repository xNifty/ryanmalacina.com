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
