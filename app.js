/*
    These are the files for my personal website, ryanmalacina.com
    This site is far from complete, looks basic, and is being worked on slowly.

    TODO (in no particular order):
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
const flash = require('connect-flash');
//const cookieParser = require('cookie-parser');
const passport = require('passport');
const User = require('./models/user');

const nonce_middleware = require('./middleware/nonce');

const app = express();
const env = app.settings.env;

// Make sure our private token exists
// @TODO: remove this hard-code and load from config file
if (!config.get('rmPrivateKey')) {
    console.error('FATAL ERROR: rmPrivateKey is not defined.');
    process.exit(1);
}

// Set default layout, can be overridden per-route as needed
const hbs = exphbs.create({
    defaultLayout: 'main',
    helpers: {
        iff: function(a, operator, b, opts) {
            let bool = false;
            switch(operator) {
                case '===':
                    bool = a === b;
                    break;
                case '>':
                    bool = a > b;
                    break;
                case '<':
                    bool = a < b;
                    break;
                default:
                    throw "Unknown operator " + operator;
            }

            if (bool) {
                return opts.fn(this);
            } else {
                return opts.inverse(this);
            }
        }
    }
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

// Add nonce to res.locals
app.use(function(req, res, next) {
    nonce = nonce_middleware.generateNonce();
    res.locals.nonce = nonce;
    res.locals.cspNonce = 'nonce-' + nonce;
    next();
})

// Finally, use the nonce middleware
app.use(csp({
    directives: nonce_middleware.getDirectives((req, res) => `'${res.locals.cspNonce}'`)
}));

//app.use(cookieParser());

// Now we don't have to hard-code this into app.js
const secret_key = config.get('privateKeyName');

//app.set('trust proxy', true);
let sess = {
    secret: config.get(secret_key),
    proxy: config.get('useProxy'),
    resave: config.get('resave'),
    saveUninitialized: config.get('saveUninitialized'),
    name: config.get('cookieName'),
    cookie: {
        httpOnly: config.get('httpOnly'),
        maxAge: 3600 * 1000,
        secure: config.get('secureCookie'),
    },
    store: new MongoStore({
        mongooseConnection: mongoose.connection, clear_interval: 3600
    })
};

// When pushed to production, we do want to use a secure cookie. Local testing we do not.
sess.cookie.secure = app.get('env') === 'production';

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

// Passport Local
const LocalStrategy = require("passport-local").Strategy;
const local = new LocalStrategy((username, password, done) => {
    User.findOne({ username })
        .then(user => {
            if (!user || !user.validPassword(password)) {
                done(null, false, { message: "Invalid username or password" });
            } else {
                done(null, user);
            }
        })
        .catch(e => done(e));
});
passport.use("local", local);

// Set favicon
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));

// Routes
const home = require('./routes/home');
const about = require('./routes/about');
const keybase = require('./routes/keybase');
const projects = require('./routes/projects');
const login = require('./routes/login');
const logout = require('./routes/logout');

// Default values; we can override this on a per-route basis if needed
// Should I maybe make these a language file and load from there?
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
    res.locals.authenticated = req.isAuthenticated();

    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');

    if (req.user) {
        res.locals.realName = req.user.realName;
    }

    resetLoginStatus(req, res);
    next();
});

function resetLoginStatus(req, res) {
    if (req.session.loginStatus)
        req.session.loginStatus = null;
}

// All of our paths
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

/*
    Error Handling
    Catch both 404 and 500 in a manner I prefer, render appropriate view with error message

    Can we move all this error logging stuff to it's own file instead of actually writing it here?
*/
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function (err, req, res, next) {
    let status = err.status ? err.status : 500;
    if (status === 404) {
        res.render('error', {
            error: env === 'development' ? err.stack.replace("\n", "<br />") : app.locals.pageNotFound
        });
    } else if (status === 500) {
        res.render('error', {
            error: env ==='development' ? err.stack.replace("\n", "<br />") : app.locals.serverError
        });
    }
});

// @TODO: move port declaration into config file instead of hardcoding it
app.listen(8080);
console.log("Server is now running in " + env + " mode.");
