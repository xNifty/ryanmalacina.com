var express = require('express');
var exphbs  = require('express-handlebars');
var path = require('path');

var app = express();

app.engine('handlebars', exphbs({}));
app.set('view engine', 'handlebars');

app.use(express.static(path.join(__dirname, 'views')));

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

app.listen(8080);
console.log("Server is now running.");