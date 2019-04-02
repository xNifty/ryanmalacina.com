//client.js
$(document).ready(function(){
    $('.publish').on('click', publishProject);
});

$(document).ready(function(){
    $('.unpublish').on('click', unpublishProject);
});

$(document).ready(function() {
    $.ajaxSetup({ cache: false }); // This part addresses an IE bug.  without it, IE will only load the first number and will never refresh
    setInterval(function() {
        $('#adminprojectlist').load('/admin/projects/api/get');
    }, 3000); // the "3000" here refers to the time to refresh the div.  it is in milliseconds.
});

function publishProject(){
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

function getProjects() {
    $.ajax({
        type: 'GET',
        url: '/admin/projects/api/get',
    }).done(function(res) {

    })
}

