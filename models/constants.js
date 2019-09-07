// Declare a lot of constants, organized in a somewhat useful manner
// Mostly, this is just strings for use throughout the system so I can stop writing the same thing over and over

var errorStrings = {
    accessDenied: "You do not have permission to access this content.",
    loginRequired: "Please login to access this content.",
    invalidLogin: "Invalid username or password!",
    missingKey: "FATAL ERROR: Private key is not defined. Please double check that everything is setup correctly",
    pageNotFound: "Seems this page doesn't exist...sorry about that!",
    serverError: "Uh oh, something went wrong when loading this page.",
    notAuthorized: "Unauthorized",
    allFieldsRequired: "An error has occurred. Please make sure all fields are filled and try again.",
    projectDescriptionLength: "The project description must be at least 20 characters in length.",
    imageRequired: "You must upload an image.",
    uniqueImageName: "Please make sure file names are unique.  If you've already uploaded this image, you do not need to upload it again.",
    invalidProject: "It appears as though you are trying to access an invalid project. Perhaps try <a href=\"\\projects\">again</a>?",
};

var statusCodeStrings = {
    401: "401 - Unauthorized",
    500: "500 - Server Error",
    404: "404 - Not Found"
};

var successStrings = {
    loginSuccess: "You have been successfully logged in!",
    logoutSuccess: "You have been successfully logged out!",
    projectAdded: "Project added successfully!",
    projectUpdated: "Project updated successfully!",
}

exports.errors = Object.freeze(errorStrings);
exports.statusCodes = Object.freeze(statusCodeStrings);
exports.success = Object.freeze(successStrings);