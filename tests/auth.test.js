import auth from "../utils/auth.js";

function makeReq({ user, authenticated = Boolean(user), headers = {}, originalUrl = "/admin/projects" } = {}) {
  return {
    user,
    originalUrl,
    flash: jest.fn(),
    isAuthenticated: () => authenticated,
    get: (name) => headers[name],
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.redirect = jest.fn(() => res);
  res.set = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
}

describe("requireAdmin", () => {
  it("should let a signed-in admin through", () => {
    const next = jest.fn();
    auth.requireAdmin(makeReq({ user: { isAdmin: true } }), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it("should send signed-out visitors to login and back", () => {
    const next = jest.fn();
    const res = makeRes();
    auth.requireAdmin(makeReq({ originalUrl: "/admin/news?status=drafts" }), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("/login?returnTo=%2Fadmin%2Fnews%3Fstatus%3Ddrafts");
  });

  it("should send signed-in non-admins home", () => {
    const next = jest.fn();
    const res = makeRes();
    const req = makeReq({ user: { isAdmin: false } });
    auth.requireAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("/");
    expect(req.flash).toHaveBeenCalledWith("error", expect.any(String));
  });

  it("should answer HTMX requests with HX-Redirect instead of a 302", () => {
    const res = makeRes();
    auth.requireAdmin(
      makeReq({ headers: { "HX-Request": "true", "HX-Current-URL": "/admin/projects" } }),
      res,
      jest.fn()
    );
    expect(res.set).toHaveBeenCalledWith("HX-Redirect", "/login?returnTo=%2Fadmin%2Fprojects");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
