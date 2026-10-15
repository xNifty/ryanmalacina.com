import "dotenv/config";
import express from "express";
import { createViewEngine } from "./utils/viewEngine.js";
import config from "config";
import session from "express-session";
import flash from "./utils/flash.js";
import cookieParser from "cookie-parser";
import passport from "passport";
import LocalStrategy from "passport-local";
import lusca from "lusca";
import rateLimit from "express-rate-limit";
import createHttpError from "http-errors";
import { generateNonce, getDirectives } from "nonce-simple";
import helmet from "helmet";

import { User } from "./models/user.js";
import renderError from "./utils/renderErrorPage.js";
import { strings } from "./config/constants.js";
import connectToDatabase from "./utils/database.js";
import urls from "./config/urls.js";

// Routes
import { homeRoute } from "./routes/home.js";
import { pageRoute } from "./routes/pages.js";
import { ogRoute } from "./routes/og.js";
import { keybaseRoute } from "./routes/keybase.js";
import { projectsRoute } from "./routes/projects.js";
import { loginRoute } from "./routes/login.js";
import { logoutRoute } from "./routes/logout.js";
import { adminRoute } from "./routes/admin/index.js";
import { parseUploads } from "./utils/imageUpload.js";
import { getSettings } from "./services/settings.js";
import { publishedPages } from "./services/pages.js";
import { accentCss } from "./utils/accent.js";
import { getBuildInfo } from "./utils/buildInfo.js";
import { siteKey as turnstileSiteKey } from "./services/turnstile.js";
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

const APP = express();
const ENV = APP.settings.env;
const MONGO_URL = process.env.mongoURL;
const SECRET_KEY = process.env.privateKey;
const MONGO_STORE = createMongoStore(MONGO_URL);

const BLOG_URL = config.get("blogURL");
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
  images: urls.imgSrc,
};

const HBS = createViewEngine();

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

APP.use(function(req, res, next) {
  const htmxNonce = req.get("X-CSP-Nonce");
  if (req.get("HX-Request") && htmxNonce) {
    res.locals.nonce = htmxNonce;
  } else {
    // Otherwise generate a fresh nonce for full page loads
    res.locals.nonce = generateNonce();
  }
  var nonce = res.locals.nonce;
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

APP.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...getDirectives(
          (req, res) => `'${res.locals.cspNonce}'`,
          NONCE_OPTIONS
        ),
        styleSrcAttr: urls.styleSrcAttr,
      },
    },
    // helmet defaults to no-referrer, which breaks the same-site return_to logic in /projects/new
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // don't force HTTPS onto subdomains (blog, docs) this app doesn't control
    strictTransportSecurity: { includeSubDomains: false },
  })
);

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(userId, done) {
  User.findById(userId)
    .then((user) => done(null, user))
    .catch((err) => done(err));
});

// Passport Stuff
const LOCAL_STRATEGY = new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username: { $eq: username } });
    if (!user || !(await user.validPassword(password))) {
      return done(null, false, { message: strings.errors.invalidLogin });
    }
    return done(null, user);
  } catch (e) {
    return done(e);
  }
});
passport.use("local", LOCAL_STRATEGY);

// The admin editor posts multipart forms (image uploads). Parse them before lusca so it can
// read the form's _csrf field, and only for admins so nobody else can make us buffer a file.
APP.use("/admin", (req, res, next) =>
  req.isAuthenticated() && req.user?.isAdmin ? parseUploads(req, res, next) : next()
);

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
  turnstileSiteKey: turnstileSiteKey(),
  // For absolute links in link-preview tags
  siteURL: String(config.get("rootURL")).replace(/\/+$/, ""),
  build: getBuildInfo(),
};

APP.use(async function(req, res, next) {
  res.locals.realName = req.session.name;
  res.locals.token = req.session.token;
  res.locals.authenticated = req.isAuthenticated();
  // lusca's per-request token, for any template that needs it
  res.locals.csrfToken = res.locals._csrf;

  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");

  const [settings, navPages] = await Promise.all([getSettings(), publishedPages()]);
  res.locals.displayBlogNav = settings.showBlog;
  res.locals.accentCss = accentCss(settings);
  res.locals.navPages = navPages;
  // For the error page and link previews
  res.locals.requestPath = req.path.slice(0, 200);

  if (req.user) {
    res.locals.realName = req.user.realName;
    res.locals.isAdmin = req.user.isAdmin;
  }

  next();
});

// All of our paths
APP.use("/", homeRoute);
APP.use("/about", pageRoute("about"));
APP.use("/now", pageRoute("now"));
APP.use("/uses", pageRoute("uses"));
APP.use("/og", ogRoute);
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

// Switched on and off in /admin/settings. A 302, since browsers cache a 301 forever.
APP.get("/blog/", async function(req, res, next) {
  if (!(await getSettings()).showBlog) return next();
  res.redirect(302, BLOG_URL);
});

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
