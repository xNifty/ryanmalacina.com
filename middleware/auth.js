const jwt = require('jsonwebtoken');
const config = require('config');
const session = require('express-session');

function auth(req, res, next) {
    const token = req.session.token;
    if (!token) return res.render("error", {
       error: "Please <a href=\"/login\">login</a> to access this content."
    });

    try {
        req.user = jwt.verify(token, config.get('rmPrivateKey'));
        next();
    } catch(ex) {
        return res.render('error', {
           error: "Please re-authenticate to access this content."
        });
    }
}

module.exports = auth;