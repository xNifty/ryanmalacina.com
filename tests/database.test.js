import mongoose from "mongoose";
import connectToDatabase from "../utils/database.js";
import { strings } from "../config/constants.js";

jest.mock("mongoose");

console.log = jest.fn();

jest.mock("../utils/errorLogging.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

process.exit = jest.fn();

describe("connectToDatabase", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should connect to the database successfully", async () => {
    mongoose.connect.mockResolvedValueOnce();

    await connectToDatabase("mockMongoURL");

    expect(mongoose.connect).toHaveBeenCalledWith("mockMongoURL", {});

    expect(console.log).toHaveBeenCalledWith(strings.database.success);

    expect(require("../utils/errorLogging").default).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("should handle connection error", async () => {
    const mockError = new Error("Mock connection error");
    mongoose.connect.mockRejectedValueOnce(mockError);

    await connectToDatabase("mockMongoURL");

    expect(mongoose.connect).toHaveBeenCalledWith("mockMongoURL", {});

    expect(console.log).toHaveBeenCalledWith(strings.database.error);

    expect(require("../utils/errorLogging").default).toHaveBeenCalledWith(
      mockError
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
