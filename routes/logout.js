import express from 'express';
import session from 'express-session';
import config from 'config';
import auth from '../middleware/auth.js';
import { constants } from '../models/constants.js';

const router = express.Router();

router.get("/", [auth.isLoggedIn], async (req, res, next) => {
    // Leaving this in place, on the off chance there isn't any JavaScript enabled
    req.logout(function(err) {
        req.flash('success', constants.success.logoutSuccess);
        return res.redirect('/');
    });
});

router.post('/', async (req, res, next) => {
    if (req.isAuthenticated()) {
        req.logout(function(err) {
            req.flash('success', constants.success.logoutSuccess);
            return res.send('{"success" : "Logged out success", "status" : 200}');
        });
        req.flash('success', constants.success.logoutSuccess);
        return res.send('{"success" : "Logged out success", "status" : 200}');
    } else {
        return res.send('/');
    }
});

export { router as logoutRoute }
