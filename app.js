/*
    These are the files for my personal website, ryanmalacina.com
    This site is far from complete, looks basic, and is being worked on slowly.

    TODO (in no particular order):
        - Format keybase page
        - Fix tabopen.js
 */

const mongoose = require('mongoose');
const express = require('express');
const exphbs  = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('config');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const csp = require('helmet-csp');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const User = require('./models/user');
const auth = require('./middleware/auth');
const helpers = require('./functions/helpers');
const errorhandler = require('./functions/errorhandler');

const nonce_middleware = require('./middleware/nonce');

const constants = require('./models/constants');

const app = express();
const env = app.settings.env;

// File versioning
const jsFileVersion = '1.0.8';
const cssFileVersion = '1.0.2';

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
        iff: helpers.iff,
    }
});

// Connect to the database
mongoose.connect('mongodb://localhost:27017/ryanmalacina', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
})
    .then(() => console.log("Connected to the database."))
    .catch(err => console.error("Error connecting to database: ", err));

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
        extended: true
    }
));

// Add nonce to res.locals
app.use(function(req, res, next) {
    nonce = nonce_middleware.generateNonce();
    res.locals.nonce = nonce;
    res.locals.cspNonce = 'nonce-' + nonce;
    next();
});

// Setup to use the nonce middlewear that we created
app.use(csp({
    directives: nonce_middleware.getDirectives((req, res) => `'${res.locals.cspNonce}'`)
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

// Passport Stuff
const LocalStrategy = require("passport-local").Strategy;
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
const home = require('./routes/home');
const about = require('./routes/about');
const keybase = require('./routes/keybase');
const projects = require('./routes/projects');
const login = require('./routes/login');
const logout = require('./routes/logout');
const administration = require('./routes/admin');

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
app.use('/', home);
app.use('/about', about);
app.use('/keybase', keybase);
app.use('/keybase.txt', keybase); // for Keybase.io
app.use('/projects', projects);
app.use('/login', login);
app.use('/logout', logout);
app.use('/admin', administration);

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
    errorhandler.renderError(env, status, err, req, res);
});

// Start everything and enjoy. :heart:
app.listen(config.get("port"));
console.log("Server is now running in " + env + " mode.");
