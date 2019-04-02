$(document).ready(function() {
    $.ajaxSetup({ cache: false });
    $('#adminprojectlist').load('/admin/projects/api/get');
});

$(document).on("click", ".publish", function() {
    publishProject();
    $('#adminprojectlist').load('/admin/projects/api/get');
});

$(document).on("click", ".unpublish", function() {
    unpublishProject();
    $('#adminprojectlist').load('/admin/projects/api/get');
});

function publishProject() {
    alert("CLICKED");
    $.ajax({
        type:'PUT',
        url: '/admin/projects/api/publish/'+ $(this).data('id'),
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
    alert("CLICKED");
    $.ajax({
        type:'PUT',
        url: '/admin/projects/api/unpublish/'+ $(this).data('id'),
    }).done(function(res) {
        if (res.success) {
            // reload page
            window.location.reload();
        }
    }).fail(function(response){
        alert("Oops not working");
    });
}

