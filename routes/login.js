import _ from 'lodash';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import express from 'express';
import passport from 'passport';
import auth from '../middleware/auth.js';
import { constants } from '../models/constants.js';

// const _ = require('lodash');
// const bcrypt = require('bcrypt');
// const {User, validate} = require('../models/user');
// const mongoose = require('mongoose');
// const express = require('express');
// const passport = require('passport');
// const auth = require('../middleware/auth');
// const constants = require('../models/constants');

const router = express.Router();

router.get("/", [auth.isLoggedOut], async (req, res) => {
    req.session.isLoginPage = true;
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
    Rewritten to properly work.  If the session variable "isLoginPage" is true and we have no returnToURL then we just flash
    success and return to the homepage.  If the session variable is true and we have a returnToURL then we return to the proper URL
    and flash success.

    If we do not have the variable, then we are coming through the navbar login.

    Doesn't appear to be any problem if the user navigates to login, then navigates away and logs in later, since
    we would hit the /login URL with a valid returnToURL.  We do need to check if we need to delete the variable if set, though.
*/
router.post('/', passport.authenticate("local", { failWithError: true }),
    function(req, res, next) {
        //console.log(req.originalUrl + ', ' + req.session.returnTo + ', ' + req.session.isLoginPage);
        let returnToURL = req.session.returnTo;
        let isLoginPage = req.session.isLoginPage;

        delete req.session.isLoginPage;
        delete req.session.returnTo;

        if (req.originalUrl === '/login' && (typeof returnToURL === 'undefined' || returnToURL === '/logout') && isLoginPage) {
            req.flash('success', constants.success.loginSuccess);
            res.redirect('/');
        } else if (req.originalUrl === '/login' && !isLoginPage && (typeof returnToURL === 'undefined' || returnToURL === '/logout')) {
            res.send('{"success" : "Log in success", "status" : 200}');
        } else {
            if (returnToURL) {
                req.flash('success', constants.success.loginSuccess);
                res.redirect(returnToURL);
            } else {
                req.flash('success', constants.success.loginSuccess);
                res.redirect('/');
            }
        }
    },
    function(err, req, res, next) {
        if (req.session.returnTo == null) {
            //req.flash('error', constants.errors.invalidLogin);
            return res.send('{"error" : "Login failed", "status" : 400}');
        } else {
            req.flash('error', constants.errors.invalidLogin);
            return res.redirect('/login');
        }
    }
);

export { router as loginRoute }
