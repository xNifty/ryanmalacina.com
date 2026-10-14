import flash from "../utils/flash.js";

function makeReq() {
  const req = { session: {} };
  flash()(req, {}, () => {});
  return req;
}

describe("flash", () => {
  it("should queue messages and hand them over once", () => {
    const req = makeReq();
    expect(req.flash("success", "Saved.")).toBe(1);
    expect(req.flash("success", ["Also saved.", "And this."])).toBe(3);

    expect(req.flash("success")).toEqual(["Saved.", "Also saved.", "And this."]);
    expect(req.flash("success")).toEqual([]);
  });

  it("should keep types apart and return everything with no arguments", () => {
    const req = makeReq();
    req.flash("success", "Yes.");
    req.flash("error", "No.");

    expect(req.flash()).toEqual({ success: ["Yes."], error: ["No."] });
    expect(req.flash()).toEqual({});
  });

  it("should survive in the session between requests", () => {
    const req = makeReq();
    req.flash("error", "Next page please.");

    const next = { session: req.session };
    flash()(next, {}, () => {});
    expect(next.flash("error")).toEqual(["Next page please."]);
  });

  it("should not call the deprecated util.isArray", () => {
    const warnings = [];
    const onWarning = (warning) => warnings.push(warning.code);
    process.on("warning", onWarning);
    makeReq().flash("success", ["a", "b"]);
    process.off("warning", onWarning);
    expect(warnings).not.toContain("DEP0044");
  });

  it("should need a session", () => {
    const req = {};
    flash()(req, {}, () => {});
    expect(() => req.flash("error", "x")).toThrow("req.flash() requires sessions");
  });
});
