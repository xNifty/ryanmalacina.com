const express = require('express');
const router = express.Router();
const session = require('express-session');
const config = require('config');
const auth = require('../middleware/auth');

router.get("/", [auth.isLoggedIn], async (req, res, next) => {
    // Leaving this in place, on the off chance there isn't any JavaScript enabled
    req.logout();
    req.flash('success', 'You have been successfully logged out!');
    return res.redirect('/');
});

router.post('/', async (req, res, next) => {
    if (req.isAuthenticated()) {
        req.logout();
        req.flash('success', 'You have been successfully logged out!');
        return res.send('{"success" : "Logged out success", "status" : 200}');
    } else {
        return res.send('/');
    }
});

module.exports = router;