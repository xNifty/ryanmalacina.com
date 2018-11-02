const jwt = require('jsonwebtoken');
const config = require('config');
const session = require('express-session');

function auth(req, res, next) {
    const token = req.session.token;
    if (!token) {
        req.session.returnTo = req.originalUrl;
	res.locals.requiresLogin = "Please login to access this content.";
	return res.redirect('/login');
        /*return res.render("login", {
            error: "Please <a href=\"/login\">login</a> to access this content."
        });*/
    }

    try {
	// Need to remove this hardcode...
        req.user = jwt.verify(token, config.get('rmPrivateKey'));
        next();
    } catch(ex) {
        return res.render('error', {
           error: "Please re-authenticate to access this content."
        });
    }
}

module.exports = auth;
