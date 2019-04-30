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

$(document).ready(function(){
    $(window).scroll(function() {
        if ($(this).scrollTop() > 100) {
            $('#scroll').fadeIn();
        } else {
            $('#scroll').fadeOut();
        }
    });
    $('#scroll').click(function() {
        $("html, body").animate({ scrollTop: 0 }, 600);
        return false;
    });
    $('#submitmail').click(function() {
        validateForm();
    });

});

function SubmitMail (){
    $.ajax({
        url:'/send',
        type:'post',
        data:$('#contact-form').serialize(),
        datatype: "jsonp",
    success: function(json)  {
            if (json.status === 200) {
                document.getElementById('contactformdiv').innerHTML = "<div class=\"text-center\">\n" +
                    "<div class=\"alert alert-success alert-dismissible center-block\">Message sent! I'll get back " +
                    "to you as soon as I can!</div></div>";
                document.getElementById('emailerror').innerHTML = '';
                document.getElementById('emailalert').style.position = 'absolute';
                document.getElementById('emailalert').style.opacity = '0';
            } else if (json.status === 406) {
                document.getElementById('emailerror').innerHTML = "Invalid sender email; please verify and " +
                    "try again.";
                document.getElementById('emailalert').style.position = 'static';
                document.getElementById('emailalert').style.opacity = '1';
            } else {
            document.getElementById('emailerror').innerHTML = "There was an error sending the email..." +
                "please try again.";
            document.getElementById('emailalert').style.position = 'static';
            document.getElementById('emailalert').style.opacity = '1';
        }
    },
    error: function()  {
        document.getElementById('emailerror').innerHTML = "There was an error sending an email..." +
            "please try again and let me know if it doesn't work.";
        document.getElementById('emailalert').style.position = 'static';
        document.getElementById('emailalert').style.opacity = '1';
    }
    });
}

function validateForm() {
    let name =  document.getElementById('name').value;
    let errortext = "";
    if (name === "") {
        errortext += 'Name is a required field.<br />';
    }
    let email =  document.getElementById('email').value;
    if (email === "") {
        errortext += 'Email is a required field.<br />'
    } else {
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if(!re.test(email)){
            errortext += 'Please provide a valid email.<br />'
        }
    }
    let subject =  document.getElementById('subject').value;
    if (subject === "") {
        errortext += 'Subject is a required field.<br />'
    }
    let message =  document.getElementById('message').value;
    if (message === "") {
        errortext += 'Message is a required field.'
    }

    if (errortext !== '') {
        document.getElementById('emailerror').innerHTML = errortext;
        document.getElementById('emailalert').style.position = 'static';
        document.getElementById('emailalert').style.opacity = '1';
        return false;
    } else {
        SubmitMail();
    }

}

// Select all links with hashes
$('a[href*="#"]')
// Remove links that don't actually link to anything
    .not('[href="#"]')
    .not('[href="#0"]')
    .click(function(event) {
        // On-page links
        if (
            location.pathname.replace(/^\//, '') === this.pathname.replace(/^\//, '')
            &&
            location.hostname === this.hostname
        ) {
            // Figure out element to scroll to
            let target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
            // Does a scroll target exist?
            if (target.length) {
                // Only prevent default if animation is actually gonna happen
                event.preventDefault();
                $('html, body').animate({
                    scrollTop: target.offset().top
                }, 1000, function() {
                    // Callback after animation
                    // Must change focus!
                    let $target = $(target);
                    //$target.focus();
                    if ($target.is(":focus")) { // Checking if the target was focused
                        return false;
                    } else {
                        $target.attr('tabindex', '-1'); // Adding tabindex for elements not focusable
                        //$target.focus(); // Set focus again
                    }
                });
            }
        }
    });