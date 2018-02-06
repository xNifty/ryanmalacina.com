var express = require('express');
var exphbs  = require('express-handlebars');
var path = require('path');

var app = express();

app.engine('handlebars', exphbs({}));
app.set('view engine', 'handlebars');

app.use(express.static(path.join(__dirname, 'views')));

app.get("/", function(req, res) {
   res.render("index");
});

app.listen(8080);
console.log("Server is now running.");