// Authentication Middleware
import { constants } from '../models/constants.js';

// Make sure the user is logged in, and if not, redirect to login with a message
export function loggedInOnly (req, res, next) {
    if (req.isAuthenticated()) next();
    else {
        var returnTo = '';
        returnTo = req.originalUrl;
        if (returnTo !== '/logout') {
            req.flash('error', constants.errors.loginRequired);
            res.status(401);
            if (returnTo === '')
                res.redirect("/login");
            else
                res.redirect("/login?returnTo=" + returnTo);
        } else {
            // Just redirect if trying to access /logout when not even logged in
            res.redirect('/');
        }
    }
}

// Make sure the user is logged in, and if not, redirect to login with a message
export function loggedInOnlyJson (req, res, next) {
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
export function loggedOutOnly (req, res, next) {
    if (req.isUnauthenticated()) next();
    else res.redirect("/");
}

// Make sure the user is an admin
export function ValidateAdmin(req, res, next) {
    if (req.user.isAdmin) next();
    else {
        req.flash('error', constants.errors.accessDenied);
        res.status(401);
        res.redirect('/');
    }
}


var isLoggedIn = loggedInOnly;
var isLoggedInJson = loggedInOnlyJson;
var isLoggedOut = loggedOutOnly;
var isAdmin = ValidateAdmin;

export default {
    isLoggedIn,
    isLoggedInJson,
    isLoggedOut,
    isAdmin
};