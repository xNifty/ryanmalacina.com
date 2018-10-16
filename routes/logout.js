const express = require('express');
const router = express.Router();
const session = require('express-session');

router.get("/", async (req, res, next) => {
    if (req.session) {
        // delete session object
        req.session.destroy(function(err) {
            if(err) {
                return next(err);
            } else {
                res.locals.loginStatus = 'You have been logged out';
                return res.redirect('/');
            }
        });
    }
});

module.exports = router;