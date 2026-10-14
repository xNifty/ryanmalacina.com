import renderErrorPage from "../utils/renderErrorPage.js";
import { strings } from "../config/constants.js";

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.render = jest.fn(() => res);
  return res;
}

describe("renderErrorPage", () => {
  const err = new Error("boom");

  it("should render a 404 with the matching status text", () => {
    const res = makeRes();
    renderErrorPage("production", 404, err, {}, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith(
      "error",
      expect.objectContaining({
        error: strings.errors.pageNotFound,
        status_code: strings.status[404],
      })
    );
  });

  it("should keep other client errors instead of turning them into 500s", () => {
    const res = makeRes();
    renderErrorPage("production", 403, err, {}, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render.mock.calls[0][1].status_code).toBe("403");
  });

  it("should treat unknown statuses as 500 and hide the stack in production", () => {
    const res = makeRes();
    renderErrorPage("production", undefined, err, {}, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render.mock.calls[0][1].error).toBe(strings.errors.serverError);
  });

  it("should show the stack in development", () => {
    const res = makeRes();
    renderErrorPage("development", 500, err, {}, res);
    expect(res.render.mock.calls[0][1].error).toContain("boom");
  });
});
