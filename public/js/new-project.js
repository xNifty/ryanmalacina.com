document.getElementById("newProjectForm").addEventListener(
  "submit",
  async function (event) {
    // Extract the project ID from the URL using a regular expression
    event.preventDefault();

    // Create FormData object to include form fields and files
    var formData = new FormData(this);

    // Get the content of the SimpleMDE editor
    var simpleMdeContent = simplemde.value();
    formData.append("project_description", simpleMdeContent);

    formData.set("project_description", simpleMdeContent);

    // Get CSRF token value
    var csrfToken = document.querySelector("input[name='_csrf']").value;

    // Make an AJAX request
    $.ajax({
      type: "POST",
      url: "/projects/new",
      data: formData,
      contentType: false,
      processData: false,
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      success: function (data) {
        if (data.status === 200 && data.hasOwnProperty("message")) {
          window.location.href = "/admin/projects";
        } else {
        }
      },
      error: function (xhr, status, error) {
        window.location.href = "/projects/new";
      },
      complete: function (xhr, status) {},
    });
  },
  { passive: true }
);
