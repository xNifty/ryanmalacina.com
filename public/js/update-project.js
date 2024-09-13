document.body.addEventListener("htmx:afterOnLoad", function (evt) {
  var trigger = evt.detail.xhr.getResponseHeader("HX-Trigger");
  if (trigger) {
    var data = JSON.parse(trigger);
    if (data.updateImage) {
      document.querySelector("#image-container").innerHTML = data.updateImage;
    }
  }
});
