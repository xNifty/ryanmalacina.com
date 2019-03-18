const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const _ = require('lodash');
const session = require('express-session');

router.get("/", [auth.isLoggedIn, auth.isAdmin], async(req, res) => {
    res.render("admin", {
        title: "Ryan Malacina | Admin Backend",
    });
});

module.exports = router;
