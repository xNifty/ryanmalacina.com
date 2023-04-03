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
    return res.render("login", {
        title: constants.pageHeader.login
    });
});

router.post('/', passport.authenticate("local", { failWithError: true }),
    function(req, res) {
        req.flash('success', constants.success.loginSuccess);
            res.redirect('/');
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
