// admin pages javascript
$(document).ready(function() {
  $('.publish').on('click', publishProject);
});

$(document).ready(function() {
  $('.unpublish').on('click', unpublishProject);
});

$(document).ready(function() {
  $('.publishNews').on('click', publishNews);
});

$(document).ready(function() {
  $('.unpublishNews').on('click', unpublishNews);
});

$(document).ready(function() {
  $('.deleteNews').on('click', deleteNews);
});

$(document).ready(function() {
  $('.deleteProject').on('click', deleteProject);
});

function publishProject() {
  $.ajax({
      type:'PUT',
      url: '/admin/projects/publish/'+ $(this).data('id'),
      datatype: "json",
      success: function () {
          window.location.reload();
      },
      fail: function () {
          alert("There was an issue publishing.  Check the error log.")
      }
  });

  return false;
}

function unpublishProject() {
  $.ajax({
      type:'PUT',
      url: '/admin/projects/unpublish/'+ $(this).data('id'),
      datatype: "json",
      success: function() {
          window.location.reload();
      },
      fail: function() {
          alert("There was an issue unpublishing.");
      }
  });

  return false;
}

function publishNews() {
  $.ajax({
      type:'PUT',
      url: '/admin/news/publish/'+ $(this).data('id'),
      datatype: "json",
      success: function() {
          window.location.reload();
      },
      fail: function() {
          alert("There was an issue publishing.");
      }
  });

  return false;
}

function unpublishNews() {
  $.ajax({
      type:'PUT',
      url: '/admin/news/unpublish/'+ $(this).data('id'),
      datatype: "json",
      success: function() {
          window.location.reload();
      },
      fail: function() {
          alert("There was an issue unpublishing.  Check the error log.")
      }
  });

  return false;
}

function deleteNews() {
  if (confirm("Are you sure you wish to delete this news entry?")) {
      $.ajax({
          type:'PUT',
          url: '/admin/news/delete/'+ $(this).data('id'),
          datatype: "json",
          success: function() {
              window.location.reload();
          },
          fail: function() {
              alert("There was an issue deleting.");
          }
      });
  
      return false;
  } else {
      return false;
  }
}

function deleteProject() {
  if (confirm("Are you sure you wish to delete this project?")) {
      $.ajax({
          type:'PUT',
          url: '/projects/delete/'+ $(this).data('id'),
          datatype: "json",
          success: function() {
              window.location.reload();
              alert("Project deleted.");
          },
          fail: function() {
              alert("There was an issue deleting.  Check the error log.")
          }
      });
  
      return false;
  } else {
      return false;
  }
}

$(document).ready(function(){
  $('.projCheckbox').on('click', updateCheckbox);
});

function updateCheckbox() {
  $(this).prop("disabled", "disabled");
  $.ajax({
      type:'put',
      url: '/projects/update/'+$(this).data('id'),
      data: "json",
      success: function() {
          $(this).removeAttr("disabled");
          window.location.reload();
      },
      fail: function() {
          alert("There was an issue updating.  Check the error log.")
      }
  });

  return false;
};

// limit 3 checkboxes on projects page
$("input[type=checkbox]").on("click", function () {
  var count = $("input[type=checkbox]:checked").length;
  if (count < 3) {  // we only want to allow 3 to be checked here.
      $("input[type=checkbox]").removeAttr("disabled");
      $("input[type=checkbox]").change(updateCheckbox);
      // re-enable all checkboxes
  } else {
      $("input[type=checkbox]").prop("disabled","disabled");
      // disable all checkboxes
      $("input[type=checkbox]:checked").removeAttr("disabled");
      // only enable the elements that are already checked.
  }
});

// limit 3 checkboxes on projects page
$(document).ready(function(){
  var count = $("input[type=checkbox]:checked").length;
  if (count < 3) {  // we only want to allow 3 to be checked here.
      $("input[type=checkbox]").removeAttr("disabled");
      $("input[type=checkbox]").change(updateCheckbox);
      // re-enable all checkboxes
  } else {
      $("input[type=checkbox]").prop("disabled","disabled");
      // disable all checkboxes
      $("input[type=checkbox]:checked").removeAttr("disabled");
      // only enable the elements that are already checked.
  }
});