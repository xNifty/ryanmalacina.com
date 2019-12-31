// Authentication Middleware

var constants = require('../models/constants');

// Make sure the user is logged in, and if not, redirect to login with a message
function loggedInOnly (req, res, next) {
    if (req.isAuthenticated()) next();
    else {
        req.session.returnTo = req.originalUrl;
        if (req.session.returnTo !== '/logout') {
            req.flash('error', constants.errors.loginRequired);
            res.status(401);
            res.redirect("/login");
        } else {
            // Just redirect if trying to access /logout when not even logged in
            res.redirect('/');
        }
    }
}

// Make sure the user is logged in, and if not, redirect to login with a message
function loggedInOnlyJson (req, res, next) {
    if (req.isAuthenticated()) next();
    else {
        //req.session.returnTo = req.originalUrl;
        req.flash('error', constants.errors.loginRequired);
        res.status(401);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({fail: "Unauthorized", status: 401}));
    }
}

// Only allow unauthenticated users access (e.g. for /login)
function loggedOutOnly (req, res, next) {
    if (req.isUnauthenticated()) next();
    else res.redirect("/");
}

// Make sure the user is an admin
function isAdmin(req, res, next) {
    if (req.user.isAdmin) next();
    else {
        req.flash('error', constants.errors.accessDenied);
        res.status(401);
    }
}


module.exports.isLoggedIn = loggedInOnly;
module.exports.isLoggedInJson = loggedInOnlyJson;
module.exports.isLoggedOut = loggedOutOnly;
module.exports.isAdmin = isAdmin;
