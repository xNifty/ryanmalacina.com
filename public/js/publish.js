//client.js
$(document).ready(function() {
    $('.publish').on('click', publishProject);
});

$(document).ready(function() {
    $('.unpublish').on('click', unpublishProject);
});

function publishProject() {
    $.ajax({
        type:'PUT',
        url: '/admin/projects/publish/'+ $(this).data('id'),
        datatype: "json",
    }).done(function()  {
        window.location.reload();
    }).fail(function()  {
        alert("There was an issue publishing.  Check the error log.")
    });

    return false;
}

function unpublishProject() {
    $.ajax({
        type:'PUT',
        url: '/admin/projects/unpublish/'+ $(this).data('id'),
        datatype: "json",
    }).done(function()  {
        window.location.reload();
    }).fail(function()  {
        alert("There was an issue unpublishing.  Check the error log.")
    });

    return false;
}