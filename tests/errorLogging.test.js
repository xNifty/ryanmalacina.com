import fs from "fs";
import logErrorToFile from "../utils/errorLogging.js";

jest.mock("fs");

describe("logErrorToFile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log an error to a file in production environment ", () => {
    process.env.NODE_ENV = "production";

    fs.existsSync.mockReturnValueOnce(false);

    fs.mkdirSync.mockImplementationOnce(() => {});

    fs.writeFileSync.mockImplementationOnce(() => {});

    const fixedTimestamp = 1234567890;

    jest.spyOn(Date, "now").mockReturnValueOnce(fixedTimestamp);

    const mockError = new Error("Test error");
    mockError.stack =
      "Error: Test error\n    at Object.<anonymous> (unknown file)";

    logErrorToFile(mockError);

    expect(fs.existsSync).toHaveBeenCalledWith("errors");
    expect(fs.mkdirSync).toHaveBeenCalledWith("errors");

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "errors/error_1234567890.log",
      "Test error\n\nError: Test error\n    at Object.<anonymous> (unknown file)"
    );

    process.env.NODE_ENV = "test";
  });

  it("should log error to console in non-production environment", () => {
    process.env.NODE_ENV = "test";

    const consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementationOnce(() => {});

    const mockError = new Error("Test error");
    mockError.stack =
      "Error: Test error\n    at Object.<anonymous> (unknown file)";

    logErrorToFile(mockError);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Test error\n\nError: Test error\n    at Object.<anonymous> (unknown file)"
    );

    process.env.NODE_ENV = "test";
  });
});
