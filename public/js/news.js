// news javascript
$(document).ready(function () {
  $("#news-search").on("click", function (event) {
    var sortOrder;
    sortOrder = $("#sort").val();
    searchNews(event, sortOrder);
  });

  $("#sort").change(function (event) {
    var sortOrder;
    sortOrder = $("#sort").val();
    searchNews(event, sortOrder);
  });

  $(function () {
    if ($("#pageCount").length) {
      // console.log("pagecount initial");
      pages = document.getElementById("pageCount").value;
    } else {
      pages = 1;
    }

    $("#compact-pagination").pagination({
      pages: pages,
      cssStyle: "compact-theme",
      hrefTextPrefix: "?page=",
      currentPage: 1,
      onPageClick: function (page, event) {
        advancePage(page, event, "", pages);
      },
    });
  });
});
function searchNews(e, sortOrder) {
  var search = $("#news-search-box").val();
  var csrfToken = document.getElementById("_csrf").value;
  e.preventDefault();
  $.ajax({
    type: "POST",
    headers: {
      "X-CSRF-TOKEN": csrfToken,
    },
    url: "/news/search?sort=" + sortOrder,
    data: {
      search: search,
    },
    datatype: "json",
    success: function (data) {
      $("#news-results").html(data);
      $("#news-search-box").val(search);
      reloadPagination(search);
    },
    fail: function () {
      alert("Error searching.");
    },
  });

  return false;
}

function reloadPagination(search = "", curpage = 1) {
  var pages;
  var useTerm = false;
  if (search === "") {
    useTerm = false;
  } else {
    useTerm = true;
    $("#news-search-box").val(search);
  }
  if ($("#pageCount").length) {
    // console.log("pagecount reload");
    pages = document.getElementById("pageCount").value;
  } else {
    pages = 1;
  }

  // console.log("useTerm:" + useTerm);
  // console.log("pageCount within reload: " + pages);

  if (useTerm) {
    $("#compact-pagination").pagination({
      pages: pages,
      cssStyle: "compact-theme",
      hrefTextPrefix: "?page=",
      hrefTextSuffix: "&term=" + search,
      currentPage: curpage,
      onPageClick: function (page, event) {
        advancePage(page, event, search, pages);
      },
    });
  } else {
    $("#compact-pagination").pagination({
      pages: pages,
      cssStyle: "compact-theme",
      hrefTextPrefix: "?page=",
      currentPage: curpage,
      onPageClick: function (page, event) {
        advancePage(page, event, "", pages);
      },
    });
  }
}

function advancePage(currentpage, e, search = "", totalPages = 1) {
  var url;
  // console.log("search within advancePage: " + search);
  // console.log("totalPages within advancePage: " + totalPages);
  if (search != "") {
    url = "/news?page=" + currentpage + "&term=" + search;
  } else {
    url = "/news?page=" + currentpage;
  }
  e.preventDefault();
  var csrfToken = document.getElementById("_csrf").value;
  $.ajax({
    type: "POST",
    headers: {
      "X-CSRF-TOKEN": csrfToken,
    },
    url: url,
    data: {
      page: currentpage,
    },
    datatype: "json",
    success: function (data) {
      $("#news-results").html(data);
      $("#news-search-box").val(search);
      $("#currentPage").val(currentpage);
      if (search != "") {
        $("#compact-pagination").pagination({
          pages: totalPages,
          cssStyle: "compact-theme",
          hrefTextPrefix: "?page=",
          hrefTextSuffix: "&term=" + search,
          currentPage: currentpage,
          onPageClick: function (page, event) {
            advancePage(page, event, search, totalPages);
          },
        });
      } else {
        $("#compact-pagination").pagination({
          pages: totalPages,
          cssStyle: "compact-theme",
          hrefTextPrefix: "?page=",
          currentPage: currentpage,
          onPageClick: function (page, event) {
            advancePage(page, event, "", totalPages);
          },
        });
      }
    },
    fail: function () {
      alert("Error searching.");
    },
  });

  return false;
}
