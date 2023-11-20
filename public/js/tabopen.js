// If the link is part of the domian, open in the same tab.
// If not, open in another tab so as to not redirect from the blog
$(document).ready(function () {
  $("a[href^=http]").each(function () {
    var excluded = ["ryanmalacina.com"];
    for (i = 0; i < excluded.length; i++) {
      if (this.href.indexOf(excluded[i]) != -1) {
        return true;
      }
    }
    if (this.href.indexOf(location.hostname) == -1) {
      $(this).click(function () {
        return true;
      });
      $(this).attr({
        target: "_blank",
        title: "Opens in a new window",
      });
      $(this).click();
    }
  });
});
