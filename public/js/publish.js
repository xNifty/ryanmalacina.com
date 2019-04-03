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
    }).done(function()  {
        alert("Success.");
    }).fail(function()  {
        alert("Sorry. Server unavailable. ");
    });
}

function unpublishProject() {
    $.ajax({
        type:'PUT',
        url: '/admin/projects/unpublish/'+ $(this).data('id'),
    }).done(function()  {
        alert("Success.");
    }).fail(function()  {
        alert("Sorry. Server unavailable. ");
    });
}