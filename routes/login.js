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

// router.post('/', passport.authenticate("local", {
//     successReturnToOrRedirect: '/',
//     failureRedirect: "/login",
//     failureFlash: true,
//     successFlash: 'You have been successfully logged in!'
// }));

router.post('/', passport.authenticate("local", { failWithError: true }),
    function(req, res, next) {
        req.flash('success', 'You have been successfully logged in!');
        return res.send('{"success" : "Updated Successfully", "status" : 200}');
    },
    function(err, req, res, next) {
        console.log(err);
        req.flash('error', 'Invalid username or password.');
        return res.send('{"fail" : "Login failed", "status" : 400}');
      }
);

module.exports = router;
