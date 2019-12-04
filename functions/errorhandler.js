/* Display the proper error page based on error code and environment. */

var constants = require('../models/constants');

function renderErrorPage(env, status, err, req, res) {
    if (status === 404) {
        console.log("We're using the function app error handler.");
        res.render('error', {
            error: env === 'development' ? err.stack.replace("\n", "<br />") : app.locals.pageNotFound,
            status_code: constants.statusCodes[404]
        });
    } else if (status === 500) {
        res.render('error', {
            error: env ==='development' ? err.stack.replace("\n", "<br />") : app.locals.serverError,
            status_code: constants.statusCodes[500]
        });
    } else if (status === 401) {
        res.render('error', {
            error: app.locals.notAuthorized,
            status_code: constants.statusCodes[401]
        })
    } else {
        res.render('error', {
            error: env ==='development' ? err.stack.replace("\n", "<br />") : app.locals.serverError,
            status_code: constants.statusCodes[500]
        })
    }
};

module.exports.renderError = renderErrorPage;