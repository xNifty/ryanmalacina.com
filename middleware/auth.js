const jwt = require('jsonwebtoken');
const config = require('config');
const session = require('express-session');

// Authentication Middleware
function loggedInOnly (req, res, next) {
    if (req.isAuthenticated()) next();
    else res.redirect("/login");
};

function loggedOutOnly (req, res, next) {
    if (req.isUnauthenticated()) next();
    else res.redirect("/");
};

module.exports.isLoggedIn = loggedInOnly;
module.exports.isLoggedOut = loggedOutOnly;
