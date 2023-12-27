import mongoose from "mongoose";
import logErrorToFile from "./errorLogging.js";
import { databaseStatus } from "../config/constants.js";

const connectToDatabase = async (mongoURL) => {
  try {
    await mongoose.connect(mongoURL, {});
    console.log(databaseStatus.success);
  } catch (err) {
    console.log(databaseStatus.error);
    logErrorToFile(err);
    process.exit(1);
  }
};

export default connectToDatabase;
