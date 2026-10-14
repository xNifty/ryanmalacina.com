// After a successful project update the server sends HX-Trigger: {"updateImage": {"src": "/images/..."}}
document.body.addEventListener("updateImage", function(evt) {
  var src = evt.detail && evt.detail.src;
  var img = document.querySelector("#image-container img");
  if (src && img) {
    img.src = src;
  }
});
