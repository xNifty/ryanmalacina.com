import handleResponse from "../utils/responseHandler.js";

describe("Response Handler", () => {
  it("should set headers and send JSON response", () => {
    const res = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    const message = "Test message";
    const status = 200;

    handleResponse(res, message, status);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/json"
    );

    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ [status]: message, status })
    );
  });
});
