//client.js
$(document).ready(function(){
    $('.publish').on('click', publishProject);
});

$(document).ready(function(){
    $('.unpublish').on('click', unpublishProject);
});

function publishProject(){
    $.ajax({
        type:'PUT',
        url: '/admin/projects/publish/'+ $(this).data('id'),
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
    $.ajax({
        type:'PUT',
        url: '/admin/projects/unpublish/'+ $(this).data('id'),
    }).done(function(res) {
        if (res.success) {
            // reload page
            window.location.reload();
        }
    }).fail(function(response){
        alert("Oops not working");
    });
}