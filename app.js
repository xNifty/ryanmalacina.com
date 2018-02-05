var express = require('express');
var exphbs  = require('express-handlebars');

var app = express();

app.engine('handlebars', exphbs({}));
app.set('view engine', 'handlebars');

app.use(express.static('assets'))

app.get("/", function(req, res) {
   res.render("index");
});

app.listen(8080);
console.log("Server is now running.");