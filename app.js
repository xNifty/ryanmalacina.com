import "dotenv/config";
import express from "express";
import exphbs from "express-handlebars";
import config from "config";
import session from "express-session";
import csp from "helmet-csp";
import flash from "connect-flash";
import cookieParser from "cookie-parser";
import passport from "passport";
import LocalStrategy from "passport-local";
import lusca from "lusca";
import rateLimit from "express-rate-limit";

import { User } from "./models/user.js";
import { iff, versionedFile } from "./utils/helpers.js";
import renderError from "./utils/renderErrorPage.js";
import { generateNonce, getDirectives } from "nonce-simple";
import { errors, pageHeader } from "./config/constants.js";
import connectToDatabase from "./utils/database.js";

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
import { createMongoStore, createSession } from "./utils/sessionHandler.js";

// Make sure our private token exists
if (!process.env.privateKey) {
  console.error(errors.missingKey);
  process.exit(1);
}

const app = express();
const env = app.settings.env;
const mongoURL = process.env.mongoURL;
const secret_key = process.env.privateKey;
const mongoStore = createMongoStore(mongoURL);

const nonceOptions = {
  scripts: [
    `https://cdnjs.cloudflare.com`,
    `https://code.jquery.com`,
    `https://maxcdn.bootstrapcdn.com`,
    `https://cdn.jsdelivr.net`,
    `https://www.google.com/recaptcha/`,
    `https://www.gstatic.com/recaptcha/`,
    `'strict-dynamic'`,
    `'unsafe-inline'`,
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
};

// Set default layout, can be overridden per-route as needed
// We also load any helper functions we wrote within helpers.js inside the functions folder
const hbs = exphbs.create({
  defaultLayout: "main",
  partialsDir: "views/partials/",
  layoutsDir: "views/layouts/",
  compilerOptions: {
    preventIndent: true,
  },
  helpers: {
    iff: iff,
    versionedFile: versionedFile,
  },
});

// Connect to the database
connectToDatabase(mongoURL);

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

app.use(express.json());
app.use(express.static("public"));
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(function (req, res, next) {
  var nonce = generateNonce();
  res.locals.nonce = nonce;
  res.locals.cspNonce = "nonce-" + nonce;
  next();
});

app.use(
  csp({
    directives: getDirectives(
      (req, res) => `'${res.locals.cspNonce}'`,
      nonceOptions
    ),
  })
);

app.use(cookieParser());
let sess = createSession(secret_key, config, mongoStore);

app.use(flash());
app.use(session(sess));

const csrf = lusca.csrf();
app.use(csrf);

app.use(passport.initialize());
app.use(passport.session());

var limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
});
app.use(limiter);

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (userId, done) {
  User.findById(userId).then((user) => {
    done(null, user);
  });
});

// Passport Stuff
const local = new LocalStrategy((username, password, done) => {
  User.findOne({ username })
    .then((user) => {
      if (!user || !user.validPassword(password)) {
        done(null, false, { message: errors.invalidLogin });
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
  title: pageHeader.index,
  pageNotFound: errors.pageNotFound,
  serverError: errors.serverError,
  environment: app.get("env"),
  notAuthorized: errors.notAuthorized,
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
