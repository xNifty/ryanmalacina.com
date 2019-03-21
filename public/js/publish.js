//client.js
$(document).ready(function(){
    $('.publish').on('click', publishProject);
});

function publishProject(){
    alert("Called");
    $.ajax({
        type:'PUT',
        url: '/admin/projects/publish/'+ $(this).data('id'),
        data: {event_name: change},
    }).done(function(response){
        console.log(response);
        window.location.replace('http://localhost:3030/');
    }).fail(function(response){
        console.log("Oops not working");
    });
}