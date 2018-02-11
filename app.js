var express = require('express');
var exphbs  = require('express-handlebars');

var app = express();
var env = app.settings.env;

// Set default layout, can be overridden per-route as needed
var hbs = exphbs.create({defaultLayout: 'main'});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

//app.use(express.static(__dirname + '/views'));
app.use(express.static('public'))

// needs to be access on all pages thanks to the footer
var currentyear = new Date().getFullYear();

// Globally accessed variables, can be overridden on a per-route basis as needed
app.locals = {
    currentyear: currentyear,
    title: "endgame.wtf"
}

app.get("/", function(req, res) {
   res.render("index", {
   });
});

app.get("/about", function(req, res) {
    res.render("about", {
    });
});

app.get("/contact", function(req, res) {
   res.render("contact", {
   });
});

// Redirect to the blog subdomain
app.get("/blog", function(req, res) {
  res.redirect(301, "https://blog.endgame.wtf");
});

// catch 404 and forward to error handler
// note this is after all good routes and is not an error handler
// to get a 404, it has to fall through to this route - no error involved
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers - these take err object.
// these are per request error handlers.  They have two so in dev
// you get a full stack trace.  In prod, first is never setup

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
if (app.get('env') === 'production') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message
        });
    });
}

app.listen(8080);
console.log("Server is now running in " + env + " mode.");
