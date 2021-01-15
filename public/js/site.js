// JavaScript for the site
$(document).ready(function() {
    $('.publish').on('click', publishProject);
});

$(document).ready(function() {
    $('.unpublish').on('click', unpublishProject);
});

$(document).ready(function() {
    $('.publishNews').on('click', publishNews);
});

$(document).ready(function() {
    $('.unpublishNews').on('click', unpublishNews);
});

$(document).ready(function() {
    $('.deleteNews').on('click', deleteNews);
});

$(document).ready(function() {
    $('.deleteProject').on('click', deleteProject);
});

$(document).ready(function() {
    $('#loginform').on('click', login);
});

// $(document).ready(function() {
//     $('#logoutlink').on('click', logout);
// });

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

function publishNews() {
    $.ajax({
        type:'PUT',
        url: '/admin/news/publish/'+ $(this).data('id'),
        datatype: "json",
    }).done(function()  {
        window.location.reload();
    }).fail(function()  {
        alert("There was an issue publishing.  Check the error log.")
    });

    return false;
}

function unpublishNews() {
    $.ajax({
        type:'PUT',
        url: '/admin/news/unpublish/'+ $(this).data('id'),
        datatype: "json",
    }).done(function()  {
        window.location.reload();
    }).fail(function()  {
        alert("There was an issue unpublishing.  Check the error log.")
    });

    return false;
}

function deleteNews() {
    if (confirm("Are you sure you wish to delete this news entry?")) {
        $.ajax({
            type:'PUT',
            url: '/admin/news/delete/'+ $(this).data('id'),
            datatype: "json",
        }).done(function()  {
            window.location.reload();
            alert("Entry deleted.");
        }).fail(function()  {
            alert("There was an issue deleting.  Check the error log.")
        });
    
        return false;
    } else {
        return false;
    }
}
function deleteProject() {
    if (confirm("Are you sure you wish to delete this project?")) {
        $.ajax({
            type:'PUT',
            url: '/projects/delete/'+ $(this).data('id'),
            datatype: "json",
        }).done(function()  {
            window.location.reload();
            alert("Project deleted.");
        }).fail(function()  {
            alert("There was an issue deleting.  Check the error log.")
        });
    
        return false;
    } else {
        return false;
    }
}

function login() {
    var form = document.getElementById('loginform');
    var loginSubmit = document.getElementById('modal-footer');
    /*var loginContent = loginSubmit.value();*/
    form.onsubmit = function (e) {
        e.preventDefault();
        var user = form.username.value;
        var pass = form.password.value;
        $.ajax({
            type: "POST",
            url: "/login",
            data: {
                username: user,
                password: pass
            },
            datatype: "json",
            done: function () {
                location.reload();
            },
            fail: function () {
                location.reload();
            },
            success: function () {
                $('#loginSubmit').hide();
                $('#loginStatus').html('<div class="alert alert-success alert-dismissible center-block">You have been successfully logged in!</div>');
                $('#sp_uname').prop('disabled', true);
                $('#sp_pass').prop('disabled', true);
                setTimeout(location.reload.bind(location), 3000);
            },
            error: function () {
                $('#loginStatus').html('<div class="alert alert-danger alert-dismissible center-block">Invalid username or password!</div>');
                $('#loginModal').effect('shake');
            },
            always: function () {
                location.reload();
            },
        });
        // form.reset();
    };
}

function logout() {
    $.ajax({
        type:'post',
        url: '/logout',
        datatype: "json",
    }).done(function()  {
        location.reload();
    }).fail(function()  {
        alert("There was an issue logging out.  Check the error log.")
    });

    return false;
}

$(document).ready(function(){

    /*Scroll to top when arrow up clicked BEGIN*/
    $(window).scroll(function() {
        var height = $(window).scrollTop();
        if (height > 100) {
            $('#scroll').fadeIn();
        } else {
            $('#scroll').fadeOut();
        }
    });
    $(document).ready(function() {
        $("#scroll").click(function(event) {
            event.preventDefault();
            $("html, body").animate({ scrollTop: 0 }, "slow");
            return false;
        });

    });
    /*Scroll to top when arrow up clicked END*/

    $('#submitmail').click(function() {
        validateForm();
    });
    $('.prjlist').slick({
        infinite: true,
        slidesToShow: 4,
        slidesToScroll: 4,
        arrows: true,
        nextArrow: '<i class="fa fa-arrow-right nextArrowBtn"></i>',
        prevArrow: '<i class="fa fa-arrow-left prevArrowBtn"></i>',
        useTransform: false
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
                if (document.getElementById('emailerror') != null) {
                    document.getElementById('emailerror').innerHTML = '';
                    document.getElementById('emailalert').style.position = 'absolute';
                    document.getElementById('emailalert').style.opacity = '0';
                }
            } else if (json.status === 406) {
                document.getElementById('emailerror').innerHTML = "Invalid sender email; please verify and " +
                    "try again.";
                document.getElementById('emailalert').style.position = 'static';
                document.getElementById('emailalert').style.opacity = '1';
                //grecaptcha.reset();
            } else {
            document.getElementById('emailerror').innerHTML = "There was an error sending the email..." +
                "please try again.";
            document.getElementById('emailalert').style.position = 'static';
            document.getElementById('emailalert').style.opacity = '1';
            //grecaptcha.reset();
        }
    },
    error: function()  {
        document.getElementById('emailerror').innerHTML = "There was an error sending an email..." +
            "please try again.  If you continue to experience issues, please " + 
            "<a href=\"https://github.com/xnifty/ryanmalacina.com/issues\">submit</a> an issue " +
            "on GitHub.";
        document.getElementById('emailalert').style.position = 'static';
        document.getElementById('emailalert').style.opacity = '1';
        //grecaptcha.reset();
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

// projects checkboxes
//client.js    
$(document).ready(function(){
    $('.projCheckbox').on('click', updateCheckbox);
});

function updateCheckbox() {
    $(this).prop("disabled", "disabled");
    $.ajax({
        type:'put',
        url: '/projects/update/'+$(this).data('id'),
        data: "json",
    }).done(function() {
        $(this).removeAttr("disabled");
        window.location.reload();
    }).fail(function() {
        alert("There was an issue updating.  Check the error log.")
    });

    return false;
};

// limit 3 checkboxes on projects page
$("input[type=checkbox]").on("click", function () {
    var count = $("input[type=checkbox]:checked").length;
    if (count < 3) {  // we only want to allow 3 to be checked here.
        $("input[type=checkbox]").removeAttr("disabled");
        $("input[type=checkbox]").change(updateCheckbox);
        // re-enable all checkboxes
    } else {
        $("input[type=checkbox]").prop("disabled","disabled");
        // disable all checkboxes
        $("input[type=checkbox]:checked").removeAttr("disabled");
        // only enable the elements that are already checked.
    }
});

// limit 3 checkboxes on projects page
$(document).ready(function(){
    var count = $("input[type=checkbox]:checked").length;
    if (count < 3) {  // we only want to allow 3 to be checked here.
        $("input[type=checkbox]").removeAttr("disabled");
        $("input[type=checkbox]").change(updateCheckbox);
        // re-enable all checkboxes
    } else {
        $("input[type=checkbox]").prop("disabled","disabled");
        // disable all checkboxes
        $("input[type=checkbox]:checked").removeAttr("disabled");
        // only enable the elements that are already checked.
    }
});

function cb(token) {
    console.log('token', token);
    var input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('name', 'g-recaptcha-response');
    input.setAttribute('value', token);
    document.getElementById('contact-form')[0].appendChild(input);
}