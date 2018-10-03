const _ = require('lodash');
const bcrypt = require('bcrypt');
const {User, validate} = require('../models/user');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const session = require('express-session');

router.get("/", async (req, res) => {
    res.render("login", {
        title: "Ryan Malacina | Projects",
    });
});

router.post('/', async(req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(500).render('error', {
        error: 'Something went wrong during the login process. Please try again.',
        auth: false,
        token: null
    });

    let user = await User.findOne({username: req.body.username});
    if (!user) return res.status(400).render('error', {
        error: 'Invalid username or password',
        auth: false,
        token: null
    });

    let validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).render('error', {
        error: 'Invalid username or password',
        auth: false,
        token: null
    });

    req.session.token = user.generateAuthToken();
    req.session.name = user.realName;

    return res.redirect('/');
});

module.exports = router;