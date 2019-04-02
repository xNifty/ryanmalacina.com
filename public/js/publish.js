$(document).ready(function() {
    $.ajaxSetup({ cache: false });
    $('#adminprojectlist').load('/admin/projects/api/get');
});

$(function(){
    $('.publish').click(function (evt) {
        publishProject();
    });
});

$(function(){
    $('.unpublish').click(function (evt) {
        unpublishProject();
    });
});

function publishProject() {
    let id = $(this).data("id");
    alert($(this).data("id"));
    $.ajax({
        type:'PUT',
        url: '/admin/projects/api/publish/'+ $(this).data('data-id'),
    }).done(function(res) {
        if (res.success) {
            // reload page
            window.location.reload();
        }
    }).fail(function(response){
        alert("Oops not working");
    });
}

function unpublishProject() {
    alert($(this).data('id'));
    $.ajax({
        type:'PUT',
        url: '/admin/projects/api/unpublish/'+ $(this).data('data-id'),
    }).done(function(res) {
        if (res.success) {
            // reload page
            window.location.reload();
        }
    }).fail(function(response){
        alert("Oops not working");
    });
}

