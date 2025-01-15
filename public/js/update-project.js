document.body.addEventListener("htmx:afterOnLoad", function(evt) {
  var trigger = evt.detail.xhr.getResponseHeader("HX-Trigger");
  if (trigger) {
    var data = JSON.parse(trigger);
    if (data.updateImage) {
      // Create a DOMParser instance
      var parser = new DOMParser();
      // Parse the HTML string into a DOM Document
      var doc = parser.parseFromString(data.updateImage, 'text/html');
      // Extract the sanitized content
      var sanitizedHTML = doc.body.innerHTML;
      // Set the sanitized content to innerHTML
      document.querySelector("#image-container").innerHTML = sanitizedHTML;
    }
  }
});
