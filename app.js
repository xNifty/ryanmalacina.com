/*
    These are the files for my personal website, ryanmalacina.com
    This site is far from complete, looks basic, and is being worked on slowly.

    TODO (in no particular order):
        - Format keybase page
        - Fix tabopen.js
 */

import mongoose from 'mongoose';
import express from 'express';
import exphbs  from 'express-handlebars';
import path from 'path';
import config from 'config';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import csp from 'helmet-csp';
import flash from 'connect-flash';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import { User } from './models/user.js';
//import auth from './middleware/auth';
import { iff } from './functions/helpers.js';
import renderError from './functions/errorhandler.js';
import { genCSP, generateNonce, getDirectives } from './middleware/nonce.js';
import { constants } from './models/constants.js'

// const mongoose = require('mongoose');
// const express = require('express');
// const exphbs  = require('express-handlebars');
// const path = require('path');
// const config = require('config');
// const session = require('express-session');
// const MongoStore = require('connect-mongo');
// const csp = require('helmet-csp');
// const flash = require('connect-flash');
// const cookieParser = require('cookie-parser');
// const passport = require('passport');

// const User = require('./models/user');
// const auth = require('./middleware/auth');
// const helpers = require('./functions/helpers');
// const errorhandler = require('./functions/errorhandler');
// const nonce_middleware = require('./middleware/nonce');
// const constants = require('./models/constants');

const app = express();
const env = app.settings.env;

// File versioning
const jsFileVersion = constants.fileVersions.cssFileVersion;
const cssFileVersion = constants.fileVersions.jsFileVersion;

// Make sure our private token exists
if (!config.get('privateKeyName')) {
    console.error(constants.errors.missingKey);
    process.exit(1);
}

// Set default layout, can be overridden per-route as needed
// We also load any helper functions we wrote within helpers.js inside the functions folder
const hbs = exphbs.create({
    defaultLayout: 'main',
    partialsDir: 'views/partials/',
    layoutsDir: 'views/layouts/',
    helpers: {
        iff: iff,
    }
});

// Connect to the database
mongoose.connect('mongodb://localhost:27017/ryanmalacina', {
})
    .then(() => console.log("Connected to the database."))
    .catch(err => console.error("Error connecting to database: ", err));

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({
        extended: true
    }
));

// Add nonce to res.locals
app.use(function(req, res, next) {
    var nonce = generateNonce();
    res.locals.nonce = nonce;
    res.locals.cspNonce = 'nonce-' + nonce;
    next();
});

// Setup to use the nonce middlewear that we created
app.use(csp({
    directives: getDirectives((req, res) => `'${res.locals.cspNonce}'`)
}));

app.use(cookieParser());

// Now we don't have to hard-code this into app.js
const secret_key = config.get('privateKeyName');

const mongoStore = MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/ryanmalacina',
    collectionName: "sessions",
    clear_interval: 3600
});

let sess = {
    secret: config.get(secret_key),
    proxy: config.get('useProxy'),
    resave: config.get('resave'),
    saveUninitialized: config.get('saveUninitialized'),
    name: config.get('cookieName'),
    cookie: {
        httpOnly: config.get('httpOnly'),
        maxAge: config.get('maxAge'),
        secure: config.get('secureCookie'),
        sameSite: config.get('sameSite'),
    },
    store: mongoStore
};

app.use(flash());
app.use(session(sess));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
    done(null, user._id);
});

passport.deserializeUser(function(userId, done) {
    User.findById(userId, (err, user) => done(err, user));
});

import LocalStrategy from 'passport-local';

// Passport Stuff
//const LocalStrategy = require("passport-local").Strategy;
const local = new LocalStrategy((username, password, done) => {
    User.findOne({ username })
        .then(user => {
            if (!user || !user.validPassword(password)) {
                done(null, false, { message: constants.errors.invalidLogin });
            } else {
                done(null, user);
            }
        })
        .catch(e => done(e));
});
passport.use("local", local);

// Routes
import { homeRoute } from './routes/home.js';
import { aboutRoute } from './routes/about.js';
import { keybaseRoute } from './routes/keybase.js';
import { projectsRoute } from './routes/projects.js';
import { loginRoute } from './routes/login.js';
import { logoutRoute } from './routes/logout.js';
import { adminRoute } from './routes/admin.js';
import { newsRoute } from './routes/news.js';

// const home = require('./routes/home');
// const about = require('./routes/about');
// const keybase = require('./routes/keybase');
// const projects = require('./routes/projects');
// const login = require('./routes/login');
// const logout = require('./routes/logout');
// const administration = require('./routes/admin');

// Default values; we can override this on a per-route basis if needed
app.locals = {
    currentyear: new Date().getFullYear(),
    title: constants.pageHeader.index,
    pageNotFound: constants.errors.pageNotFound,
    serverError: constants.errors.serverError,
    environment: app.get('env'),
    notAuthorized: constants.errors.notAuthorized,
    jsFileVersion: jsFileVersion,
    cssFileVersion: cssFileVersion
};

app.use(function(req, res, next) {
    res.locals.realName = req.session.name;
    res.locals.token = req.session.token;
    res.locals.authenticated = req.isAuthenticated();

    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');

    if (req.user) {
        res.locals.realName = req.user.realName;
        res.locals.isAdmin = req.user.isAdmin;
    }
    next();
});

// All of our paths
app.use('/', homeRoute);
app.use('/about', aboutRoute);
app.use('/keybase', keybaseRoute);
app.use('/keybase.txt', keybaseRoute); // for Keybase.io
app.use('/projects', projectsRoute);
app.use('/login', loginRoute);
app.use('/logout', logoutRoute);
app.use('/admin', adminRoute);
app.use('/news', newsRoute);

// Send user to my blog via a 301 redirect
app.get("/blog", function(req, res) {
    res.redirect(301, config.get("blogURL"));
});

// Send user to my documentation site via a 301 redirect
app.get("/docs", function(req, res) {
    res.redirect(301, config.get("docsURL"));
});

/*
    Catch errors and pass information to our error handler to render the proper page.
*/
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function (err, req, res, next) {
    let status = err.status ? err.status : 500;
    renderError(env, status, err, req, res);
});

// Start everything and enjoy. :heart:
app.listen(config.get("port"));
console.log("Server is now running in " + env + " mode.");
