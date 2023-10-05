// sitewide javascript

$(document).ready(function() {
    $('#loginform').on('click', login);

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

$(document).ready(function() {
    const el = document.getElementById('password');
    const msg = document.getElementById('password-message');

    if (el !== null) {
        el.addEventListener('keydown', e => {
            msg.style = e.getModifierState('CapsLock') ? 'display: block' : 'display: none';
        });
    }
});

$(document).ready(function() {
    const el = document.getElementById('sp_pass');
    const msg = document.getElementById('sp_pass_message');

    if (el !== null) {
        el.addEventListener('keydown', e => {
            msg.style = e.getModifierState('CapsLock') ? 'display: block' : 'display: none';
        });
    }
});

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
            success: function () {
                $('#loginSubmit').hide();
                $('#loginStatus').html('<div class="loginModalAlert alert alert-success alert-dismissible center-block text-center">You have been successfully logged in!</div>');
                $('#sp_uname').prop('disabled', true);
                $('#sp_pass').prop('disabled', true);
                setTimeout(location.reload.bind(location), 3000);
            },
            error: function () {
                $('#loginStatus').html('<div class="loginModalAlert alert alert-danger alert-dismissible center-block text-center">Invalid username or password!</div>');
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
        success: function() {
            location.reload();
        },
        fail: function() {
            alert("There was an issue logging out, please report this if it continues.")
        }
    });

    return false;
}

$(document).ready(function(){

    
});

function resetToken() {
    grecaptcha.ready(function() {
        grecaptcha.execute('6LeCKqYUAAAAAAh4n_WgK7e-fKbqOgrukjjBmqBG', {
            action: 'homepage'
        }).then(cb);
    });
}

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
            } else {
            document.getElementById('emailerror').innerHTML = "There was an error sending the email..." +
                "please try again.";
            document.getElementById('emailalert').style.position = 'static';
            document.getElementById('emailalert').style.opacity = '1';
            }
        },
        error: function()  {
            document.getElementById('emailerror').innerHTML = "There was an error sending the email..." +
            "please try again.  If you continue to experience issues, please " + 
            "<a href=\"https://github.com/xnifty/ryanmalacina.com/issues\">submit</a> an issue.";
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
        document.getElementById('name').classList.add('invalid');
    }
    let email =  document.getElementById('email').value;
    if (email === "") {
        errortext += 'Email is a required field.<br />';
        document.getElementById('email').classList.add('invalid');
    } else {
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if(!re.test(email)){
            errortext += 'Please provide a valid email.<br />';
            document.getElementById('email').classList.add('invalid');
        }
    }
    let subject =  document.getElementById('subject').value;
    if (subject === "") {
        errortext += 'Subject is a required field.<br />';
        document.getElementById('subject').classList.add('invalid');
    }
    let message =  document.getElementById('message').value;
    if (message === "") {
        errortext += 'Message is a required field.';
        document.getElementById('message').classList.add('invalid');
    }

    if (errortext !== '') {
        document.getElementById('emailerror').innerHTML = errortext;
        document.getElementById('emailalert').style.position = 'static';
        document.getElementById('emailalert').style.opacity = '1';
        return false;
    } else {
        resetToken();
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

function cb(token) {
    //console.log('token:', token);
    $('#g-recaptcha-response').val(token);
}