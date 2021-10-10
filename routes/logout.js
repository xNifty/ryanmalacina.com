import express from 'express';
import session from 'express-session';
import config from 'config';
import auth from '../middleware/auth.js';
import { constants } from '../models/constants.js';

// const express = require('express');
// const session = require('express-session');
// const config = require('config');
// const auth = require('../middleware/auth');
// const constants = require('../models/constants');

const router = express.Router();

router.get("/", [auth.isLoggedIn], async (req, res, next) => {
    // Leaving this in place, on the off chance there isn't any JavaScript enabled
    req.logout();
    req.flash('success', constants.success.logoutSuccess);
    return res.redirect('/');
});

router.post('/', async (req, res, next) => {
    if (req.isAuthenticated()) {
        req.logout();
        req.flash('success', constants.success.logoutSuccess);
        return res.send('{"success" : "Logged out success", "status" : 200}');
    } else {
        return res.send('/');
    }
});

export { router as logoutRoute }
