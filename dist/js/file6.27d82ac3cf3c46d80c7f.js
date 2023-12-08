(()=>{"use strict";function e(){var e=document.getElementById("loginform");document.getElementById("modal-footer"),e.onsubmit=function(t){t.preventDefault();var a=e.username.value,n=e.password.value;$.ajax({type:"POST",url:"/login/modal",data:{username:a,password:n},datatype:"json",success:function(){$("#loginSubmit").hide(),$("#loginStatus").html('<div class="modalAlert alert alert-success alert-dismissible center-block text-center">You have been successfully logged in!</div>'),$("#sp_uname").prop("disabled",!0),$("#sp_pass").prop("disabled",!0),setTimeout(location.reload.bind(location),3e3)},error:function(){$("#loginStatus").html('<div class="modalAlert alert alert-danger alert-dismissible center-block text-center">Invalid username or password!</div>'),$("#loginModal").effect("shake")},always:function(){location.reload()}})}}function t(e){$("#g-recaptcha-response").val(e)}$(document).ready((function(){$("#loginform").on("click",e),$(window).scroll((function(){$(window).scrollTop()>100?$("#scroll").fadeIn():$("#scroll").fadeOut()})),$(document).ready((function(){$("#scroll").click((function(e){return e.preventDefault(),$("html, body").animate({scrollTop:0},"slow"),!1}))})),$("#submitmail").click((function(){!function(){let e="";""===document.getElementById("name").value&&(e+="Name is a required field.<br />",document.getElementById("name").classList.add("invalid"));let a=document.getElementById("email").value;if(""===a?(e+="Email is a required field.<br />",document.getElementById("email").classList.add("invalid")):/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(a)||(e+="Please provide a valid email.<br />",document.getElementById("email").classList.add("invalid")),""===document.getElementById("subject").value&&(e+="Subject is a required field.<br />",document.getElementById("subject").classList.add("invalid")),""===document.getElementById("message").value&&(e+="Message is a required field.",document.getElementById("message").classList.add("invalid")),""!==e)return document.getElementById("emailerror").innerHTML=e,document.getElementById("emailalert").style.position="static",document.getElementById("emailalert").style.opacity="1",!1;grecaptcha.ready((function(){grecaptcha.execute("6LeCKqYUAAAAAAh4n_WgK7e-fKbqOgrukjjBmqBG",{action:"homepage"}).then(t)})),$.ajax({url:"/send",type:"post",data:$("#contact-form").serialize(),datatype:"jsonp",success:function(e){200===e.status?(document.getElementById("contactformdiv").innerHTML='<div class="text-center">\n<div class="alert alert-success alert-dismissible center-block">Message sent! I\'ll get back to you as soon as I can!</div></div>',null!=document.getElementById("emailerror")&&(document.getElementById("emailerror").innerHTML="",document.getElementById("emailalert").style.position="absolute",document.getElementById("emailalert").style.opacity="0")):406===e.status?(document.getElementById("emailerror").innerHTML="Invalid sender email; please verify and try again.",document.getElementById("emailalert").style.position="static",document.getElementById("emailalert").style.opacity="1"):(document.getElementById("emailerror").innerHTML="There was an error sending the email...please try again.",document.getElementById("emailalert").style.position="static",document.getElementById("emailalert").style.opacity="1")},error:function(){document.getElementById("emailerror").innerHTML='There was an error sending the email...please try again.  If you continue to experience issues, please <a href="https://github.com/xnifty/ryanmalacina.com/issues">submit</a> an issue.',document.getElementById("emailalert").style.position="static",document.getElementById("emailalert").style.opacity="1"}})}()})),$(".prjlist").slick({infinite:!0,slidesToShow:4,slidesToScroll:4,arrows:!0,nextArrow:'<i class="fa fa-arrow-right nextArrowBtn"></i>',prevArrow:'<i class="fa fa-arrow-left prevArrowBtn"></i>',useTransform:!1}),function(){const e=document.getElementById("sp_pass"),t=document.getElementById("sp_pass_message");null!==e&&e.addEventListener("keydown",(e=>{t.style=e.getModifierState("CapsLock")?"display: block":"display: none"}))}(),function(){const e=document.getElementById("password"),t=document.getElementById("password-message");null!==e&&e.addEventListener("keydown",(e=>{t.style=e.getModifierState("CapsLock")?"display: block":"display: none"}))}()})),$('a[href*="#"]').not('[href="#"]').not('[href="#0"]').click((function(e){if(location.pathname.replace(/^\//,"")===this.pathname.replace(/^\//,"")&&location.hostname===this.hostname){let t=$(this.hash);t=t.length?t:$("[name="+this.hash.slice(1)+"]"),t.length&&(e.preventDefault(),$("html, body").animate({scrollTop:t.offset().top},1e3,(function(){let e=$(t);if(e.is(":focus"))return!1;e.attr("tabindex","-1")})))}}))})();