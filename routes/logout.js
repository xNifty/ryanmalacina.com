const express = require('express');
const router = express.Router();
const session = require('express-session');
const config = require('config');

router.get("/", async (req, res, next) => {
    req.logout();
    req.flash('success', 'You have been successfully logged out!');
    return res.redirect('/');
});

module.exports = router;