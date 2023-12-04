import "dotenv/config";
import mongoose from "mongoose";
import express from "express";
import exphbs from "express-handlebars";
import config from "config";
import session from "express-session";
import MongoStore from "connect-mongo";
import csp from "helmet-csp";
import flash from "connect-flash";
import cookieParser from "cookie-parser";
import passport from "passport";
import LocalStrategy from "passport-local";

import { User } from "./models/user.js";
import { iff } from "./functions/helpers.js";
import renderError from "./functions/errorhandler.js";
import { generateNonce, getDirectives } from "nonce-simple";
import { constants } from "./config/constants.js";

// Routes
import { homeRoute } from "./routes/home.js";
import { aboutRoute } from "./routes/about.js";
import { keybaseRoute } from "./routes/keybase.js";
import { projectsRoute } from "./routes/projects.js";
import { loginRoute } from "./routes/login.js";
import { logoutRoute } from "./routes/logout.js";
import { adminRoute } from "./routes/admin.js";
import { newsRoute } from "./routes/news.js";
import { resetRoute } from "./routes/reset.js";
import { passwordReset } from "./routes/resetPassword.js";
import { profileRoute } from "./routes/profile.js";

const app = express();
const env = app.settings.env;

// File versioning
const jsFileVersion = constants.fileVersions.jsFileVersion;
const cssFileVersion = constants.fileVersions.cssFileVersion;
const adminJSFileVersion = constants.fileVersions.adminJSFileVersion;
const newsJSFileVersion = constants.fileVersions.newsJSFileVersion;

// Make sure our private token exists
if (!process.env.privateKey) {
  console.error(constants.errors.missingKey);
  process.exit(1);
}

const nonceOptions = {
  scripts: [
    `https://cdnjs.cloudflare.com`,
    `https://code.jquery.com`,
    `https://maxcdn.bootstrapcdn.com`,
    `https://cdn.jsdelivr.net`,
    `https://www.google.com/recaptcha/`,
    `https://www.gstatic.com/recaptcha/`,
  ],
  styles: [
    `https://cdnjs.cloudflare.com`,
    `https://fonts.googleapis.com`,
    `https://maxcdn.bootstrapcdn.com`,
    `https://cdn.jsdelivr.net`,
  ],
  fonts: [
    `https://cdnjs.cloudflare.com`,
    `https://fonts.gstatic.com`,
    `https://maxcdn.bootstrapcdn.com`,
  ],
  connect: [`https://cdn.jsdelivr.net`],
  frame: [`https://www.google.com/recaptcha/`],
  reportTo: "https://ryanmalacina.report-uri.com/r/d/csp/enforce",
  useUnsafeInline: true,
};

// Set default layout, can be overridden per-route as needed
// We also load any helper functions we wrote within helpers.js inside the functions folder
const hbs = exphbs.create({
  defaultLayout: "main",
  partialsDir: "views/partials/",
  layoutsDir: "views/layouts/",
  helpers: {
    iff: iff,
  },
});

var mongoURL = process.env.mongoURL;

// Connect to the database
mongoose
  .connect(mongoURL, {})
  .then(() => console.log("Connected to the database."))
  .catch((err) => console.error("Error connecting to database: ", err));

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

app.use(express.json());
app.use(express.static("public"));
app.use(
  express.urlencoded({
    extended: true,
  })
);

// Add nonce to res.locals
app.use(function (req, res, next) {
  var nonce = generateNonce();
  res.locals.nonce = nonce;
  res.locals.cspNonce = "nonce-" + nonce;
  next();
});

// Setup to use the nonce middlewear that we created
app.use(
  csp({
    directives: getDirectives(
      (req, res) => `'${res.locals.cspNonce}'`,
      nonceOptions
    ),
  })
);

app.use(cookieParser());

// Now we don't have to hard-code this into app.js
const secret_key = process.env.privateKey;

const mongoStore = MongoStore.create({
  mongoUrl: mongoURL,
  collectionName: "sessions",
  clear_interval: 3600,
});

let sess = {
  secret: secret_key,
  proxy: config.get("useProxy"),
  resave: config.get("resave"),
  saveUninitialized: config.get("saveUninitialized"),
  name: config.get("cookieName"),
  cookie: {
    httpOnly: config.get("httpOnly"),
    maxAge: config.get("maxAge"),
    secure: config.get("secureCookie"),
    sameSite: config.get("sameSite"),
  },
  store: mongoStore,
};

app.use(flash());
app.use(session(sess));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

await passport.deserializeUser(function (userId, done) {
  User.findById(userId).then((user) => {
    done(null, user);
  });
});

// Passport Stuff
const local = new LocalStrategy((username, password, done) => {
  User.findOne({ username })
    .then((user) => {
      if (!user || !user.validPassword(password)) {
        done(null, false, { message: constants.errors.invalidLogin });
      } else {
        done(null, user);
      }
    })
    .catch((e) => done(e));
});
passport.use("local", local);

// Default values; we can override this on a per-route basis if needed
app.locals = {
  currentyear: new Date().getFullYear(),
  title: constants.pageHeader.index,
  pageNotFound: constants.errors.pageNotFound,
  serverError: constants.errors.serverError,
  environment: app.get("env"),
  notAuthorized: constants.errors.notAuthorized,
  jsFileVersion: jsFileVersion,
  cssFileVersion: cssFileVersion,
  adminJSFileVersion: adminJSFileVersion,
  newsJSFileVersion: newsJSFileVersion,
};

app.use(function (req, res, next) {
  res.locals.realName = req.session.name;
  res.locals.token = req.session.token;
  res.locals.authenticated = req.isAuthenticated();

  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");

  res.locals.displayBlogNav = config.get("showBlog");

  if (req.user) {
    res.locals.realName = req.user.realName;
    res.locals.isAdmin = req.user.isAdmin;
  }
  next();
});

// All of our paths
app.use("/", homeRoute);
app.use("/about", aboutRoute);
app.use("/keybase", keybaseRoute);
app.use("/keybase.txt", keybaseRoute); // for Keybase.io
app.use("/projects", projectsRoute);
app.use("/login", loginRoute);
app.use("/logout", logoutRoute);
app.use("/admin", adminRoute);
app.use("/news", newsRoute);
app.use("/reset", resetRoute);
app.use("/resetPassword", passwordReset);
app.use("/profile", profileRoute);

// Send user to my blog via a 301 redirect
app.get("/blog", function (req, res) {
  res.redirect(301, config.get("blogURL"));
});

// Send user to my documentation site via a 301 redirect
app.get("/docs", function (req, res) {
  res.redirect(301, config.get("docsURL"));
});

/*
    Catch errors and pass information to our error handler to render the proper page.
*/
app.use(function (req, res, next) {
  let err = new Error("Not Found");
  err.status = 404;
  next(err);
});

app.use(function (err, req, res, next) {
  let status = err.status ? err.status : 500;
  renderError(env, status, err, req, res);
});

// Start everything and enjoy. :heart:
app.listen(process.env.PORT);
console.log("Server is now running in " + env + " mode.");
