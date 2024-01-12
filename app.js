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
import createHttpError from "http-errors";
import { generateNonce, getDirectives } from "nonce-simple";

import { User } from "./models/user.js";
import { iff, versionedFile } from "./utils/helpers.js";
import renderError from "./utils/renderErrorPage.js";
import { strings } from "./config/constants.js";
import connectToDatabase from "./utils/database.js";
import urls from "./config/urls.js";

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
  console.error(strings.errors.missingKey);
  process.exit(1);
}

const app = express();
const env = app.settings.env;
const mongoURL = process.env.mongoURL;
const secret_key = process.env.privateKey;
const mongoStore = createMongoStore(mongoURL);

const blogURL = config.get("blogURL");
const showBlog = config.get("showBlog");
const docsURL = config.get("docsURL");
const showDocs = config.get("showDocs");

const nonceOptions = {
  scripts: urls.scriptSrc,
  styles: urls.styleSrc,
  fonts: urls.fontSrc,
  connect: urls.connectSrc,
  frame: urls.frameSrc,
  reportTo: urls.reportUri,
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
app.set("trust proxy", config.get("trustProxy"));

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

let sess = createSession(secret_key, config, mongoStore);

app.use(flash());
app.use(
  cookieParser(),
  session(sess), // cookie security is set via config key, keeps getting flagged
  passport.initialize(),
  passport.session()
);

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
  User.findOne({ username: { $eq: username } })
    .then((user) => {
      if (!user || !user.validPassword(password)) {
        done(null, false, { message: strings.errors.invalidLogin });
      } else {
        done(null, user);
      }
    })
    .catch((e) => done(e));
});
passport.use("local", local);

app.use(
  lusca.csrf({
    cookie: true,
  })
);

// Default values; we can override this on a per-route basis if needed
app.locals = {
  currentyear: new Date().getFullYear(),
  title: strings.pageHeader.index,
  pageNotFound: strings.errors.pageNotFound,
  serverError: strings.errors.serverError,
  environment: app.get("env"),
  notAuthorized: strings.errors.notAuthorized,
};

app.use(function (req, res, next) {
  res.locals.realName = req.session.name;
  res.locals.token = req.session.token;
  res.locals.authenticated = req.isAuthenticated();

  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");

  res.locals.displayBlogNav = showBlog;

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

if (showBlog) {
  app.get("/blog/", function (req, res) {
    res.redirect(301, blogURL);
  });
}

if (showDocs) {
  app.get("/docs/", function (req, res) {
    res.redirect(301, docsURL);
  });
}
/*
    Catch errors and pass information to our error handler to render the proper page.
*/
app.use(function (req, res, next) {
  next(createHttpError(404, "Page Not Found"));
});

app.use(function (err, req, res, next) {
  const status = err.status ? err.status : 500;
  renderError(env, status, err, req, res);
});

// Start everything and enjoy. :heart:
app.listen(process.env.PORT);
console.log("Server is now running in " + env + " mode.");
