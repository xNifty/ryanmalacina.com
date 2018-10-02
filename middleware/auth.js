const jwt = require('jsonwebtoken');
const config = require('config');

function auth(req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) return res.render("error", {
       error: "Please login to access this content."
    });

    try {
        req.user = jwt.verify(token, config.get('rmPrivateKey'));
        next();
    } catch(ex) {
        return res.render('error', {
           error: "Something went wrong, sorry about that."
        });
    }
}

module.exports = auth;