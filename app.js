import "dotenv/config";
import express from "express";
import exphbs from "express-handlebars";
import config from "config";
import session from "express-session";
import flash from "connect-flash";
import cookieParser from "cookie-parser";
import passport from "passport";
import LocalStrategy from "passport-local";
import lusca from "lusca";
import rateLimit from "express-rate-limit";
import createHttpError from "http-errors";
import { generateNonce, getDirectives } from "nonce-simple";
import { createRequire } from "module";

import { User } from "./models/user.js";
import { iff, versionedFile } from "./utils/helpers.js";
import renderError from "./utils/renderErrorPage.js";
import { strings } from "./config/constants.js";
import connectToDatabase from "./utils/database.js";
import urls from "./config/urls.js";
import connectToClient from './utils/elastic.js';
import ElasticIndex from './utils/elasticIndex.js';

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

const require = createRequire(import.meta.url);

// Make sure our private token exists
if (!process.env.privateKey) {
  console.error(strings.errors.missingKey);
  process.exit(1);
}

const APP = express();
const ENV = APP.settings.env;
const MONGO_URL = process.env.mongoURL;
const SECRET_KEY = process.env.privateKey;
const MONGO_STORE = createMongoStore(MONGO_URL);
const ELASTIC_USERNAME = process.env.elasticUsername;
const ELASTIC_PASSWORD = process.env.elasticPassword;
const ELASTIC_URL = process.env.elasticURL;
const USE_ELASTIC = process.env.useElastic;

const BLOG_URL = config.get("blogURL");
const SHOW_BLOG = config.get("showBlog");
const DOCS_URL = config.get("docsURL");
const SHOW_DOCS = config.get("showDocs");

const NONCE_OPTIONS = {
  scripts: urls.scriptSrc,
  styles: urls.styleSrc,
  fonts: urls.fontSrc,
  connect: urls.connectSrc,
  frame: urls.frameSrc,
  reportTo: urls.reportUri,
  requireTrustedTypesFor: urls.requireTrustedTypesFor,
};

var CLIENT;

// Set default layout, can be overridden per-route as needed
// We also load any helper functions we wrote within helpers.js inside the functions folder
const HBS = exphbs.create({
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

if (USE_ELASTIC == 'true') {
  ElasticIndex();

  CLIENT = connectToClient(ELASTIC_USERNAME, ELASTIC_PASSWORD, ELASTIC_URL);
  //export { CLIENT };

  // TODO: create function to automatically create indexes for schemas so that we don't have to do this here and can
  // instead handle this per model schema and have them all be included in Elasticsearch
  const ELASTIC = async () => {
    const exists = await CLIENT.indices.exists({ index: 'news' });
    console.log("Exists: ", exists);
    if (!exists) {
      await CLIENT.indices.create({
        index: 'news',
        body: {
          mappings: {
            properties: {
              news_title: { type: 'text' },
              news_description_html: { type: 'text' },
              published_date: { type: 'text' },
              published_date_unclean: { type: 'date' },
              news_clean_output: { type: 'text' },
            },
          },
        },
      });
    } else {
    }
  };

  // Create index
  ELASTIC();
}

export { CLIENT };

// Connect to the database
try {
  connectToDatabase(MONGO_URL);
} catch (error) {
  console.log(error);
  process.exit(1);
}

APP.engine("handlebars", HBS.engine);
APP.set("view engine", "handlebars");
APP.set("trust proxy", config.get("trustProxy"));

APP.use(express.json());
APP.use(express.static("public"));
APP.use(
  express.urlencoded({
    extended: true,
  })
);

APP.locals.elasticClient = CLIENT;

APP.use(function(req, res, next) {
  var nonce = generateNonce();
  res.locals.nonce = nonce;
  res.locals.cspNonce = "nonce-" + nonce;
  next();
});

let sess = createSession(SECRET_KEY, config, MONGO_STORE);

var limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
});

APP.use(
  flash(),
  cookieParser(),
  session(sess), // cookie security is set via config key, keeps getting flagged
  passport.initialize(),
  passport.session(),
  limiter
);

// Required for helmet-csp after v4.0.0
async function setupHelmetCSP() {
  const csp = require("helmet-csp");
  APP.use(
    csp({
      directives: getDirectives(
        (req, res) => `'${res.locals.cspNonce}'`,
        NONCE_OPTIONS
      ),
    })
  );
}

setupHelmetCSP().catch(console.error);

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(userId, done) {
  User.findById(userId).then((user) => {
    done(null, user);
  });
});

// Passport Stuff
const LOCAL_STRATEGY = new LocalStrategy((username, password, done) => {
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
passport.use("local", LOCAL_STRATEGY);

APP.use(
  lusca.csrf({
    cookie: true,
  })
);

// Default values; we can override this on a per-route basis if needed
APP.locals = {
  currentyear: new Date().getFullYear(),
  title: strings.pageHeader.index,
  pageNotFound: strings.errors.pageNotFound,
  serverError: strings.errors.serverError,
  environment: APP.get("env"),
  notAuthorized: strings.errors.notAuthorized,
};

APP.use(function(req, res, next) {
  res.locals.realName = req.session.name;
  res.locals.token = req.session.token;
  res.locals.authenticated = req.isAuthenticated();

  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");

  res.locals.displayBlogNav = SHOW_BLOG;

  if (req.user) {
    res.locals.realName = req.user.realName;
    res.locals.isAdmin = req.user.isAdmin;
  }

  next();
});

// All of our paths
APP.use("/", homeRoute);
APP.use("/about", aboutRoute);
APP.use("/keybase", keybaseRoute);
APP.use("/keybase.txt", keybaseRoute); // for Keybase.io
APP.use("/projects", projectsRoute);
APP.use("/login", loginRoute);
APP.use("/logout", logoutRoute);
APP.use("/admin", adminRoute);
APP.use("/news", newsRoute);
APP.use("/reset", resetRoute);
APP.use("/resetPassword", passwordReset);
APP.use("/profile", profileRoute);

if (SHOW_BLOG) {
  APP.get("/blog/", function(req, res) {
    res.redirect(301, BLOG_URL);
  });
}

if (SHOW_DOCS) {
  APP.get("/docs/", function(req, res) {
    res.redirect(301, DOCS_URL);
  });
}
/*
    Catch errors and pass information to our error handler to render the proper page.
*/
APP.use(function(req, res, next) {
  next(createHttpError(404, "Page Not Found"));
});

APP.use(function(err, req, res, next) {
  let status = err.status ? err.status : 500;
  renderError(ENV, status, err, req, res);
});

// Start everything and enjoy. :heart:
APP.listen(process.env.PORT);
console.log("Server is now running in " + ENV + " mode.");
