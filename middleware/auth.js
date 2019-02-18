// Authentication Middleware
function loggedInOnly (req, res, next) {
    if (req.isAuthenticated()) next();
    else {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'Please login to access this content.');
        res.redirect("/login");
    }
}

function loggedOutOnly (req, res, next) {
    if (req.isUnauthenticated()) next();
    else res.redirect("/");
}

module.exports.isLoggedIn = loggedInOnly;
module.exports.isLoggedOut = loggedOutOnly;
