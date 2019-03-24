//client.js
$(document).ready(function(){
    $('#publish').on('click', publishProject);
    $('#unpublish').on('click', unpublishProject);
});

function publishProject(){
    alert("Publish");
    $.ajax({
        type:'PUT',
        url: '/admin/projects/publish/'+ $(this).data('id'),
    }).done(function(response){
        console.log(response);
        window.location.replace('http://localhost:8080/');
    }).fail(function(response){
        console.log("Oops not working");
    });
}

function unpublishProject() {
    alert("Unpublish");
    $.ajax({
        type:'PUT',
        url: '/admin/projects/unpublish/'+ $(this).data('id'),
    }).done(function(response){
        console.log(response);
        window.location.replace('http://localhost:3030/');
    }).fail(function(response){
        console.log("Oops not working");
    });
}