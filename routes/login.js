const _ = require('lodash');
const bcrypt = require('bcrypt');
const {User, validate} = require('../models/user');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const session = require('express-session');
const errorHandler = require('../functions/errorhandler');

router.get("/", async (req, res) => {
    let error_message = '';

    if (req.session.errorMessage) {
        error_message = req.session.errorMessage;
        delete req.session.errorMessage;
    }

    return res.render("login", {
        title: "Ryan Malacina | Login",
        error_message: error_message,
    });
});

router.post('/', async(req, res) => {
    const { error } = validate(req.body);
    if (error) {
        return errorHandler.renderErrorPage(500, error.message, req, res);
    }

    let user = await User.findOne({username: req.body.username});
    if (!user) {
        res.status(500);
        req.session.errorMessage = 'Invalid username or password';
        return res.redirect('/login');
    }

    let validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
        res.status(500);
        req.session.errorMessage = 'Invalid username or password';
        return res.redirect('/login');
    }

    req.session.token = user.generateAuthToken();
    req.session.name = user.realName;
    req.session.session_authenticated = true;
    req.session.loginStatus = "You have been successfully logged in";

    return res.redirect('/');
});

module.exports = router;