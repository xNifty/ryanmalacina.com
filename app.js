/*
    These are the files for my personal website, ryanmalacina.com
    This site is far from complete, looks basic, and is being worked on slowly.

    TODO (in no particular order):
        - Load projects from a database and have a single route to handle that based on project
        - Overhaul homepage to redo project listing
        - Create a real contact page (reverted to just link for now)
        - Format keybase page
        - Fix tabopen.js
 */

const mongoose = require('mongoose');
const express = require('express');
const exphbs  = require('express-handlebars');
const favicon = require('serve-favicon');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('config');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const csp = require('helmet-csp');
const mNonce = require('./middleware/nonce');

const app = express();
const env = app.settings.env;

// Make sure our private token exists
if (!config.get('rmPrivateKey')) {
    console.error('FATAL ERROR: rmPrivateKey is not defined.');
    process.exit(1);
}

// Set default layout, can be overridden per-route as needed
const hbs = exphbs.create({
    defaultLayout: 'main',
});

// Connect to the database
mongoose.connect('mongodb://localhost:27017/ryanmalacina', {useNewUrlParser: true})
    .then(() => console.log("Connected to the database."))
    .catch(err => console.error("Error connecting to database: ", err));

// For now, suppress message about using createIndexes
mongoose.set('useCreateIndex', true);

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded(
    {
        extended: true
    }
));

app.use(function(req, res, next) {
    nonce = mNonce.generateNonce();
    res.locals.nonce = nonce;
    res.locals.cspNonce = 'nonce-' + nonce;
    next();
})

app.use(csp({
    directives: mNonce.getDirectives((req, res) => `'${res.locals.cspNonce}'`)
}));

// Now we don't have to hardcode this into app.js
const secret_key = config.get('privateKeyName');

app.set('trust proxy', true);
let sess = {
    secret: config.get(secret_key),
    proxy: config.get('useProxy'),
    resave: config.get('resave'),
    saveUninitialized: config.get('saveUninitialized'),
    name: config.get('cookieName'),
    cookie: {
        httpOnly: config.get('httpOnly'),
        maxAge: 24 * 60 * 60 * 1000,
    },
    store: new MongoStore({
        mongooseConnection: mongoose.connection, clear_interval: 3600
    })
};

// When pushed to production, we do want to use a secure cookie. Local testing we do not.
sess.cookie.secure = app.get('env') === 'production';

app.use(session(sess));

// Set favicon
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));

// Routes
const home = require('./routes/home');
const about = require('./routes/about');
const keybase = require('./routes/keybase');
const projects = require('./routes/projects');
const login = require('./routes/login');
const logout = require('./routes/logout');

// Override these as needed on a per-route basis
app.locals = {
    currentyear: new Date().getFullYear(),
    title: "Ryan Malacina | ryanmalacina.com",
    pageNotFound: "Seems this page doesn't exist...sorry about that!",
    serverError: "Uh oh, something went wrong when loading this page.",
    environment: app.get('env')
};

app.use(function(req, res, next) {
    res.locals.realName = req.session.name;
    res.locals.token = req.session.token;
    res.locals.authenticated = req.session.session_authenticated;

    if (req.session.loginStatus)
        res.locals.loginStatus = req.session.loginStatus;

    resetLoginStatus(req, res);
    next();
});

function resetLoginStatus(req, res) {
    if (req.session.loginStatus)
        req.session.loginStatus = null;
}

app.use('/', home);
app.use('/about', about);
app.use('/keybase', keybase);
app.use('/keybase.txt', keybase); // For Keybase.io
app.use('/projects', projects);
app.use('/login', login);
app.use('/logout', logout);

app.get("/blog", function(req, res) {
    res.redirect(301, "https://blog.ryanmalacina.com");
});

app.get("/docs", function(req, res) {
    res.redirect(301, "https://docs.ryanmalacina.com");
});

// Error handling
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/*
    Error Handling
    Catch both 404 and 500 in a manner I prefer, render appropriate view with error message
*/
app.use(function (err, req, res, next) {
    let status = err.status ? err.status : 500;
    if (status === 404) {
        res.render('error', {
            error: env === 'development' ? err.stack.replace("\n", "<br />") : res.locals.pageNotFound
        });
    } else if (status === 500) {
        res.render('error', {
            error: env ==='development' ? err.stack.replace("\n", "<br />") : res.locals.serverError
        });
    }
});

// Listen on 8080, output which mode the app is running in
app.listen(8080);
console.log("Server is now running in " + env + " mode.");
