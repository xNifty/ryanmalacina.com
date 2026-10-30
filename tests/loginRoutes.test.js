/*
  Logging in and out over HTTP. The test app stands in for app.js's session, passport and CSRF
  setup, with a local strategy that knows one user and no database.
*/
import path from "path";
import express from "express";
import session from "express-session";
import passport from "passport";
import LocalStrategy from "passport-local";
import request from "supertest";
import lusca from "lusca";
import flash from "../utils/flash.js";

import { createViewEngine } from "../utils/viewEngine.js";
import { loginRoute } from "../routes/login.js";
import { logoutRoute } from "../routes/logout.js";

const mockConfig = { rootURL: "http://localhost" };

jest.mock("config", () => ({
  has: jest.fn((key) => key in mockConfig),
  get: jest.fn((key) => mockConfig[key]),
}));

const USER = { _id: "u1", email: "ryan@example.com", isAdmin: true };
const GOOD = { email: USER.email, password: "correct horse" };
const HTMX = { "HX-Request": "true" };

passport.use(
  "local",
  new LocalStrategy({ usernameField: "email" }, (email, password, done) =>
    done(null, email === GOOD.email && password === GOOD.password ? USER : false)
  )
);
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser((id, done) => done(null, id === USER._id ? USER : false));

function buildApp() {
  const app = express();
  const hbs = createViewEngine();
  app.engine("handlebars", hbs.engine);
  app.set("view engine", "handlebars");
  app.set("views", path.resolve("views"));
  app.use(express.urlencoded({ extended: true }));
  app.use(session({ secret: "test", resave: false, saveUninitialized: true }));
  app.use(flash());
  app.use(passport.initialize(), passport.session());
  // Login tests post without a token; app.js checks those too, but that's lusca's job, not ours
  app.use("/logout", lusca.csrf());
  app.get("/token", lusca.csrf(), (req, res) => res.json({ token: res.locals._csrf }));
  app.use("/login", loginRoute);
  app.use("/logout", logoutRoute);
  app.get("/whoami", (req, res) => res.json({ user: req.user?.email ?? null, success: req.flash("success") }));
  return app;
}

describe("POST /login", () => {
  it("should tell htmx to load the next page in full, not swap it in", async () => {
    const res = await request(buildApp()).post("/login").set(HTMX).type("form").send(GOOD);
    expect(res.status).toBe(200);
    expect(res.headers["hx-redirect"]).toBe("/");
    expect(res.text).toBe("");
  });

  it("should send htmx logins back to the returnTo on the page they came from", async () => {
    const res = await request(buildApp())
      .post("/login")
      .set({ ...HTMX, "HX-Current-URL": "http://localhost/login?returnTo=%2Fadmin%2Fnews" })
      .type("form")
      .send(GOOD);
    expect(res.headers["hx-redirect"]).toBe("http://localhost/admin/news");
  });

  it("should redirect plain form posts to returnTo", async () => {
    const res = await request(buildApp()).post("/login?returnTo=%2Fprofile").type("form").send(GOOD);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost/profile");
  });

  it("should not send anyone off-site", async () => {
    const res = await request(buildApp())
      .post("/login?returnTo=https%3A%2F%2Fevil.example.com%2F")
      .type("form")
      .send(GOOD);
    expect(res.headers.location).toBe("/");
  });

  it("should leave the visitor signed in, with a welcome message", async () => {
    const agent = request.agent(buildApp());
    await agent.post("/login").set(HTMX).type("form").send(GOOD);
    const res = await agent.get("/whoami");
    expect(res.body.user).toBe(USER.email);
    expect(res.body.success).toHaveLength(1);
  });

  it("should answer a wrong password with an alert for the form", async () => {
    const res = await request(buildApp())
      .post("/login")
      .set(HTMX)
      .type("form")
      .send({ ...GOOD, password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.headers["hx-redirect"]).toBeUndefined();
    expect(res.text).toContain('role="alert"');
  });
});

async function signedIn() {
  const agent = request.agent(buildApp());
  await agent.post("/login").set(HTMX).type("form").send(GOOD);
  const { token } = (await agent.get("/token")).body;
  return { agent, token };
}

describe("POST /logout", () => {
  it("should sign the user out once, with one message", async () => {
    const { agent, token } = await signedIn();

    const res = await agent.post("/logout").type("form").send({ _csrf: token });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");

    const after = await agent.get("/whoami");
    expect(after.body.user).toBeNull();
    expect(after.body.success).toHaveLength(1);
  });

  it("should refuse a logout without the CSRF token, e.g. from another site", async () => {
    const { agent } = await signedIn();
    const res = await agent.post("/logout").type("form").send({});
    expect(res.status).toBe(403);
    expect((await agent.get("/whoami")).body.user).toBe(USER.email);
  });

  it("should not log out on a plain GET", async () => {
    const { agent } = await signedIn();
    const res = await agent.get("/logout");
    expect(res.status).toBe(404);
    expect((await agent.get("/whoami")).body.user).toBe(USER.email);
  });

  it("should just go home when nobody is signed in", async () => {
    const agent = request.agent(buildApp());
    const { token } = (await agent.get("/token")).body;
    const res = await agent.post("/logout").type("form").send({ _csrf: token });
    expect(res.headers.location).toBe("/");
    expect((await agent.get("/whoami")).body.success).toHaveLength(0);
  });
});
