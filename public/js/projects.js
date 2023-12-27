// document
//   .getElementById("projectEditForm")
//   .addEventListener("submit", async function (event) {
//     // Extract the project ID from the URL using a regular expression
//     event.preventDefault();
//     var projectIdMatch = window.location.pathname.match(
//       /\/projects\/([^\/]+)\/edit/
//     );

//     if (!projectIdMatch || projectIdMatch.length < 2) {
//       console.error("Unable to extract project ID from the URL.");
//       return;
//     }

//     var projectId = projectIdMatch[1];

//     // Create FormData object to include form fields and files
//     var formData = new FormData(this);

//     // Get the content of the SimpleMDE editor
//     var simpleMdeContent = simplemde.value();
//     formData.append("project_description", simpleMdeContent);

//     formData.set("project_description", simpleMdeContent);

//     // Get CSRF token value
//     var csrfToken = document.querySelector("input[name='_csrf']").value;

//     // Make an AJAX request
//     $.ajax({
//       type: "POST",
//       url: "/projects/" + projectId + "/edit",
//       data: formData,
//       contentType: false,
//       processData: false,
//       headers: {
//         "X-CSRF-Token": csrfToken,
//       },
//       success: function (data) {
//         if (data.status === 200 && data.hasOwnProperty("message")) {
//           window.location.href = "/projects/" + projectId;
//         } else {
//         }
//       },
//       error: function (xhr, status, error) {
//         window.location.href = "/projects/" + projectId + "/edit";
//       },
//       complete: function (xhr, status) {},
//     });
//   });

document
  .getElementById("newProjectForm")
  .addEventListener("submit", async function (event) {
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

    console.log(csrfToken);

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
  });
