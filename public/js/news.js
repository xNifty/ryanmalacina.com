// news javascript
$(document).ready(function() {
  $('#news-search').on('click', searchNews);
});

function searchNews(e) {
  var search = $('#news-search-box').val();
  e.preventDefault();
  $.ajax({
      type:'POST',
      url: '/news/search',
      data: {
          search: search,
      },
      datatype: "json",
      success: function(data)  {
          $("#news-results").html(data);
          $('#news-search-box').val(search);
          reloadPagination(search);
      },
      fail: function() {
          alert("Error searching.");
      }
  });

  return false;
}

var getUrlParameter = function getUrlParameter(sParam) {
  var sPageURL = window.location.search.substring(1),
      sURLVariables = sPageURL.split('&'),
      sParameterName,
      i;

  for (i = 0; i < sURLVariables.length; i++) {
      sParameterName = sURLVariables[i].split('=');

      if (sParameterName[0] === sParam) {
          return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
      }
  }
  return "";
};

function reloadPagination(search = "") {
  var pages;
  var useTerm = false;
  if (search === "") {
    useTerm = false;
  } else {
    useTerm = true;
    $('#news-search-box').val(search);
  }
  if ($("#pageCount").length) {
    console.log("pagecount2");
    pages = document.getElementById("pageCount").value
  } else {
      pages = 1;
  }

  if (useTerm) {
    $("#compact-pagination").pagination({
      pages: pages,
      cssStyle: 'compact-theme',
      hrefTextPrefix: '?page=',
      hrefTextSuffix: '&term='+search,
      currentPage: 1,
    });
  } else {
    $("#compact-pagination").pagination({
      pages: pages,
      cssStyle: 'compact-theme',
      hrefTextPrefix: '?page=',
      currentPage: 1,
    });
  }
};

$(document).ready(function(){
  $(function() {
    var pages;
    if ($("#pageCount").length) {
      console.log("pagecount");
        pages = document.getElementById("pageCount").value
    } else {
        pages = 1;
    }

    var useTerm = false;
    var term = getUrlParameter('term');
    if (term === "") {
      useTerm = false;
    } else {
      $('#news-search-box').val(term);
      useTerm = true;
    }

    if (useTerm) {
      $("#compact-pagination").pagination({
        pages: pages,
        cssStyle: 'compact-theme',
        hrefTextPrefix: '?page=',
        hrefTextSuffix: '&term='+term,
        currentPage: getUrlParameter('page'),
      });
    } else {
      $("#compact-pagination").pagination({
        pages: pages,
        cssStyle: 'compact-theme',
        hrefTextPrefix: '?page=',
        currentPage: getUrlParameter('page'),
      });
    }
  });
});

// it is probably not a good idea to keep your own history

//getUrlParameter('page')