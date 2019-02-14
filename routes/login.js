const _ = require('lodash');
const bcrypt = require('bcrypt');
const {User, validate} = require('../models/user');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const passport = require('passport');
const auth = require('../middleware/auth');

router.get("/", [auth.isLoggedOut], async (req, res) => {
    return res.render("login", {
        title: "Ryan Malacina | Login"
    });
});

router.post('/', passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
    successFlash: 'You have been successfully logged in!'
}));

module.exports = router;
