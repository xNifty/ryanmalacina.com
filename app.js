var express = require('express');
var exphbs  = require('express-handlebars');
var path = require('path');

var app = express();
var env = app.settings.env;

app.engine('handlebars', exphbs({}));
app.set('view engine', 'handlebars');

//app.use(express.static(__dirname + '/views'));
app.use(express.static('public'))

// global, passed to all views that have the footer
var currentyear = new Date().getFullYear();

app.get("/", function(req, res) {
   res.render("index", {
      currentyear: currentyear
   });
});

app.get("/about", function(req, res) {
    res.render("about", {
        currentyear: currentyear
    });
});

app.get("/contact", function(req, res) {
   res.render("contact", {
       currentyear: currentyear
   });
});

// Redirect to blog
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
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.listen(8080);
console.log("Server is now running in " + env + " mode.");
