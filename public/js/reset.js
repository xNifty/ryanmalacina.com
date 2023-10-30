// sitewide javascript

// $(document).ready(function() {
//     $('#forgotpassword').on('click', reset);

//     /* Scroll to top */
//     $(window).scroll(function() {
//         var height = $(window).scrollTop();
//         if (height > 100) {
//             $('#scroll').fadeIn();
//         } else {
//             $('#scroll').fadeOut();
//         }
//     });
//     $(document).ready(function() {
//         $("#scroll").click(function(event) {
//             event.preventDefault();
//             $("html, body").animate({ scrollTop: 0 }, "slow");
//             return false;
//         });

//     });
// });
    

// function reset() {
//     var form = document.getElementById('forgotpassword');
//     var loginSubmit = document.getElementById('modal-footer');
//     form.onsubmit = function (e) {
//         e.preventDefault();
//         var e1 = form.email_one.value;
//         var e2 = form.email_two.value;
//         $.ajax({
//             type: "POST",
//             url: "/reset",
//             data: {
//                 email_one: e1,
//                 email_two: e2
//             },
//             datatype: "json",
//             success: function () {
//                 location.href("/");
//             },
//             error: function () {
//                 location.href("/");
//             },
//             always: function () {
//                 location.href("/");
//             },
//         });
//     };
// }