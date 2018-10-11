const express = require('express');

module.exports = {
    renderErrorPage: function (status, error, req, res) {
        if (req.app.locals.environment === 'development') {
            if (status === 404) {
               res.render('error', {
                    error: error,
                });
            } else if (status === 500) {
                res.render('error', {
                    error: error,
                });
            } else {
                res.render('error', {
                    error: 'Something went wrong.'
                });
            }
        }

        /*
            Production Error Handling
            Catch both 404 and 500 in a manner I prefer, render appropriate view with proper message
        */
        if (req.app.locals.environment === 'production') {
            if (status === 404) {
                res.render('error', {
                    error: req.app.locals.pageNotFound
                });
            } else if (status === 500) {
                res.render('error', {
                    error: req.app.locals.serverError
                });
            } else {
                res.render('error', {
                    error: 'Something went wrong.'
                });
            }
        }
    }
};