// Declare all of our strings that we use throughout the system here as constants

var errorStrings = {
    accessDenied: "You do not have permission to access this content.",
    loginRequired: "Please login to access this content.",
    invalidLogin: "Invalid username or password!",
    missingKey: "FATAL ERROR: Private key is not defined. Please double check that everything is setup correctly",
    pageNotFound: "Seems this page doesn't exist...sorry about that!",
    serverError: "Uh oh, something went wrong when loading this page.",
    notAuthorized: "Unauthorized",
};

var statusCodeStrings = {
    401: "401 - Unauthorized",
    500: "500 - Server Error",
    404: "404 - Not Found"
};

var successStrings = {
    loginSuccess: "You have been successfully logged in!",
    logoutSuccess: "You have been successfully logged out!",
}

exports.errors = Object.freeze(errorStrings);
exports.statusCodes = Object.freeze(statusCodeStrings);
exports.success = Object.freeze(successStrings);