const defaultPolicy = trustedTypes.createPolicy('default', {
  createHTML: (html) => html,
});

document.body.addEventListener("htmx:afterOnLoad", function(evt) {
  var trigger = evt.detail.xhr.getResponseHeader("HX-Trigger");
  if (trigger) {
    var data = JSON.parse(trigger);
    if (data.updateImage) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(data.updateImage, 'text/html');
      var sanitizedHTML = defaultPolicy.createHTML(doc.body.innerHTML);
      document.querySelector("#image-container").innerHTML = sanitizedHTML;
    }
  }
});
