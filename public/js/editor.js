// Turn every textarea[data-markdown-editor] into a SimpleMDE editor.
// The placeholder comes from the textarea's data-placeholder attribute.
(function() {
  if (typeof SimpleMDE === "undefined") {
    return;
  }

  document.querySelectorAll("textarea[data-markdown-editor]").forEach(function(element) {
    new SimpleMDE({
      element: element,
      toolbar: ["preview"],
      placeholder: element.dataset.placeholder || "",
    });
  });
})();
