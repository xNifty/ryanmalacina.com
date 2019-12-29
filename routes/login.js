const _ = require('lodash');
const bcrypt = require('bcrypt');
const {User, validate} = require('../models/user');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const passport = require('passport');
const auth = require('../middleware/auth');

const constants = require('../models/constants');

router.get("/", [auth.isLoggedOut], async (req, res) => {
    return res.render("login", {
        title: constants.pageHeader.login
    });
});

// router.post('/', passport.authenticate("local", {
//     successReturnToOrRedirect: '/',
//     failureRedirect: "/login",
//     failureFlash: true,
//     successFlash: 'You have been successfully logged in!'
// }));

/*
    I do some funky stuff here...if the base uri is login, we need to do a proper
    flash and redirect.  If it's coming from a JSON post (e.g. using nav bar login)
    we actually return JSON for the browser, so we don't need to do any redirects
    By doing this, we prevent the /login showing the JSON codes and actually doing something
*/
router.post('/', passport.authenticate("local", { failWithError: true }),
    function(req, res, next) {
        console.log(req.originalUrl + ', ' + req.session.returnTo);
        if (req.originalUrl === '/login' && typeof req.session.returnTo === 'undefined') {
            req.flash('success', constants.success.loginSuccess);
            return res.send('{"success" : "Log in success", "status" : 200}');
        } else {
            if (req.session.returnTo) {
                req.flash('success', constants.success.loginSuccess);
                res.redirect(req.session.returnTo)
                delete req.session.returnTo;
            } else {
                req.flash('success', constants.success.loginSuccess);
                res.redirect('/');
            }
        }
    },
    function(err, req, res, next) {
        if (req.session.returnTo == null) {
            req.flash('error', constants.errors.invalidLogin);
            return res.send('{"error" : "Login failed", "status" : 400}');
        } else {
            req.flash('error', constants.errors.invalidLogin);
            return res.redirect('/login');
        }
    }
);

module.exports = router;
