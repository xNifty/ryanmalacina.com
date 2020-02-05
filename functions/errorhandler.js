/*
    Error Handling
    Catch both 404 and 500 in a manner I prefer, render appropriate view with error message

    This is still required to render the right view with the right error message.  In the development environment
    we show the error message right on the screen so that we can fix it, while on production we just render
    the error page with the generic error message relevant to that error message.
*/

var constants = require('../models/constants');

function renderErrorPage(env, status, err, req, res) {
    if (status === 404) {
        res.render('error', {
            error: env === 'development' ? err.stack.replace("\n", "<br />") : constants.errors.pageNotFound,
            status_code: constants.statusCodes[404]
        });
    } else if (status === 500) {
        res.render('error', {
            error: env ==='development' ? err.stack.replace("\n", "<br />") : constants.errors.serverError,
            status_code: constants.statusCodes[500]
        });
    } else if (status === 401) {
        res.render('error', {
            error: constants.errors.notAuthorized,
            status_code: constants.statusCodes[401]
        })
    } else {
        res.render('error', {
            error: env ==='development' ? err.stack.replace("\n", "<br />") : constants.errors.serverError,
            status_code: constants.statusCodes[500]
        })
    }
};

module.exports.renderError = renderErrorPage;
