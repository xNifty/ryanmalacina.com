// One-off: make MongoDB's indexes match the schemas (drops indexes no schema declares
// and builds missing ones). Run after changing an index, e.g. the news text index:
//   npm run sync-indexes
import "dotenv/config";
import mongoose from "mongoose";

import { News } from "../models/news.js";
import { Project } from "../models/projects.js";
import { User } from "../models/user.js";
import { Token } from "../models/token.js";

await mongoose.connect(process.env.mongoURL);

for (const model of [News, Project, User, Token]) {
  const dropped = await model.syncIndexes();
  console.log(`${model.modelName}: synced${dropped.length ? `, dropped ${dropped.join(", ")}` : ""}`);
}

await mongoose.disconnect();
