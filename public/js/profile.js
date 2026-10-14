// Profile page: the new-password fields must match, and a password change needs all three fields.
(function() {
  var form = document.getElementById("profile_content");
  if (!form) return;

  var first = document.getElementById("pass_change_one");
  var second = document.getElementById("pass_change_two");
  var current = document.getElementById("pass_current");
  var message = document.getElementById("passwordMatchError");

  function update() {
    var changing = first.value !== "" || second.value !== "";
    [first, second, current].forEach(function(input) {
      input.required = changing;
    });

    var mismatch = changing && second.value !== "" && first.value !== second.value;
    message.textContent = mismatch ? "The new passwords don't match." : "";
    second.setCustomValidity(mismatch ? "The new passwords don't match." : "");
  }

  first.addEventListener("input", update);
  second.addEventListener("input", update);
})();
