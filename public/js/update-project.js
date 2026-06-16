document.body.addEventListener("htmx:afterOnLoad", function(evt) {
  var trigger = evt.detail.xhr.getResponseHeader("HX-Trigger");
  if (trigger) {
    var data = JSON.parse(trigger);
    if (data.updateImage) {
      var trustedTypesPolicy = window.trustedTypesPolicy || { createHTML: (html) => html };
      var parser = new DOMParser();
      var doc = parser.parseFromString(trustedTypesPolicy.createHTML(data.updateImage), 'text/html');
      var sanitizedHTML = trustedTypesPolicy.createHTML(doc.body.innerHTML);
      document.querySelector("#image-container").innerHTML = sanitizedHTML;
    }
  }
});
