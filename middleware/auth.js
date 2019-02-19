// Authentication Middleware

// Make sure the user is logged in, and if not, redirect to login with a message
function loggedInOnly (req, res, next) {
    if (req.isAuthenticated()) next();
    else {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'Please login to access this content.');
        res.redirect("/login");
    }
}

// User is already authenticated, so redirect them back to the root
function loggedOutOnly (req, res, next) {
    if (req.isUnauthenticated()) next();
    else res.redirect("/");
}

module.exports.isLoggedIn = loggedInOnly;
module.exports.isLoggedOut = loggedOutOnly;
