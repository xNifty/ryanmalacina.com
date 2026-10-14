import auth from "../utils/auth.js";

function makeReq(user) {
  return { user, flash: jest.fn() };
}

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.redirect = jest.fn(() => res);
  return res;
}

describe("ValidateAdmin", () => {
  it("should call next for an admin", () => {
    const next = jest.fn();
    auth.ValidateAdmin(makeReq({ isAdmin: true }), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it("should redirect a non-admin", () => {
    const next = jest.fn();
    const res = makeRes();
    auth.ValidateAdmin(makeReq({ isAdmin: false }), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("/");
  });

  it("should redirect instead of throwing when there is no user", () => {
    const next = jest.fn();
    const res = makeRes();
    expect(() => auth.ValidateAdmin(makeReq(undefined), res, next)).not.toThrow();
    expect(next).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("/");
  });
});
