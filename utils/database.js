import mongoose from "mongoose";

import logErrorToFile from "./errorLogging.js";
import { strings } from "../config/constants.js";

const connectToDatabase = async (mongoURL) => {
  try {
    await mongoose.connect(mongoURL, {});
    console.log(strings.database.success);
  } catch (err) {
    console.log(strings.database.error);
    logErrorToFile(err);
    process.exit(1);
  }
};

export default connectToDatabase;
