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

const express = require('express');
const exphbs  = require('express-handlebars');
const favicon = require('serve-favicon');
const path = require('path');

const bodyParser = require('body-parser');

const app = express();
const env = app.settings.env;

// Set default layout, can be overridden per-route as needed
const hbs = exphbs.create({defaultLayout: 'main'});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use(express.static('public'));
app.use(bodyParser.urlencoded(
    {
        extended: true
    }
));

// Set favicon
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));

// needs to be access on all pages thanks to the footer
const currentyear = new Date().getFullYear();

// Override these as needed on a per-route basis
app.locals = {
    currentyear: currentyear,
    title: "Ryan Malacina | ryanmalacina.com",
    pageNotFound: "Seems this page doesn't exist...sorry about that!",
    serverError: "Uh oh, something went wrong when loading this page."
};

app.get("/", function(req, res) {
    res.render("index", {
        title: "Ryan Malacina | Home",
    });
});

app.get("/about", function(req, res) {
    res.render("about", {
        title: "Ryan Malacina | About",
    });
});

app.get("/contact", function(req, res) {
    res.render("contact", {
        title: "Ryan Malacina | Contact",
    });
});

app.get("/keybase.txt", function(req, res) {
    res.render("keybase", {
        title: "Ryan Malacina | Keybase Identity",
        layout: false
    });
});

app.get("/blog", function(req, res) {
    res.redirect(301, "https://blog.ryanmalacina.com");
});

app.get("/docs", function(req, res) {
    res.redirect(301, "https://docs.ryanmalacina.com");
});

// catch 404 and forward to error handler
// note this is after all good routes and is not an error handler
// to get a 404, it has to fall through to this route - no error involved
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/*
    Development Error Handling

    Catch both 404 and 500 in a manner I prefer, render appropriate view with error message
*/
if (app.get('env') === 'development') {
    app.use(function(err, req, res) {
        let status = err.status ? err.status : 500;
        if (status === 404) {
            res.render('error', {
                message: err.message,
                error: err
            });
        } else if (status === 500) {
            res.render('error', {
                message: err.message,
                error: err
            });
        }
    });
}

/*
    Production Error Handling

    Catch both 404 and 500 in a manner I prefer, render appropriate view with proper message
*/
if (app.get('env') === 'production') {
    app.use(function(err, req, res) {
        let status = err.status ? err.status : 500;
        if (status === 404) {
            res.render('error', {
                error: app.locals.pageNotFound
            });
        } else if (status === 500) {
            res.render('error', {
                error: app.locals.serverError
            });
        }
    });
}

// Listen on 8080, output which mode the app is running in
app.listen(8080);
console.log("Server is now running in " + env + " mode.");
